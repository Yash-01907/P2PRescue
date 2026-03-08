// __tests__/usecases/CreateSOSUseCase.test.js
const CreateSOSUseCase = require('../../src/usecases/CreateSOSUseCase');
const Location = require('../../src/domain/entities/Location');
const { EventBus } = require('../../src/domain/events');

// Mock ports
const createMockLocationPort = (location = null) => ({
  getBestLocation: jest.fn().mockResolvedValue(location),
});

const createMockStoragePort = () => ({
  savePacket: jest.fn().mockResolvedValue(true),
});

const createMockTransportPort = (running = true) => ({
  isRunning: jest.fn().mockReturnValue(running),
  sendPacket: jest.fn().mockResolvedValue(true),
});

describe('CreateSOSUseCase', () => {
  let locationPort, storagePort, transportPort, eventBus, useCase;

  beforeEach(() => {
    locationPort = createMockLocationPort(
      new Location({
        latitude: 28.6139,
        longitude: 77.209,
        accuracy: 10,
        source: 'GPS_LIVE',
      }),
    );
    storagePort = createMockStoragePort();
    transportPort = createMockTransportPort(true);
    eventBus = new EventBus();
    useCase = new CreateSOSUseCase(
      locationPort,
      storagePort,
      transportPort,
      eventBus,
    );
  });

  it('should create a valid SOS packet with live GPS', async () => {
    const result = await useCase.execute({
      message: 'Trapped under rubble',
      injuredCount: 1,
      waterAvailable: false,
      batteryPercent: 34,
      deviceId: 'test-device-hash',
    });

    expect(result.success).toBe(true);
    expect(result.packet).toBeDefined();
    expect(result.packet.payload.message).toBe('Trapped under rubble');
    expect(result.packet.location.source).toBe('GPS_LIVE');
    expect(result.packet.checksum).toBeTruthy();
  });

  it('should save packet to storage', async () => {
    await useCase.execute({
      message: 'Help!',
      deviceId: 'test-device',
    });

    expect(storagePort.savePacket).toHaveBeenCalledTimes(1);
  });

  it('should broadcast to mesh when transport is running', async () => {
    await useCase.execute({
      message: 'Help!',
      deviceId: 'test-device',
    });

    expect(transportPort.sendPacket).toHaveBeenCalledTimes(1);
  });

  it('should NOT broadcast when transport is not running', async () => {
    transportPort = createMockTransportPort(false);
    useCase = new CreateSOSUseCase(
      locationPort,
      storagePort,
      transportPort,
      eventBus,
    );

    await useCase.execute({
      message: 'Help!',
      deviceId: 'test-device',
    });

    expect(transportPort.sendPacket).not.toHaveBeenCalled();
  });

  it('should work with no location (LOCATION_PENDING)', async () => {
    locationPort = createMockLocationPort(null); // No GPS
    useCase = new CreateSOSUseCase(
      locationPort,
      storagePort,
      transportPort,
      eventBus,
    );

    const result = await useCase.execute({
      message: 'No GPS available',
      deviceId: 'test-device',
    });

    expect(result.success).toBe(true);
    expect(result.packet.location.source).toBe('NONE');
  });

  it('should emit SOSCreatedEvent', async () => {
    const listener = jest.fn();
    eventBus.on('SOS_CREATED', listener);

    await useCase.execute({
      message: 'Help!',
      deviceId: 'test-device',
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
