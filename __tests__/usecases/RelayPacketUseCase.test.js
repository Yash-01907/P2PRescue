// __tests__/usecases/RelayPacketUseCase.test.js
const RelayPacketUseCase = require('../../src/usecases/RelayPacketUseCase');
const SOSPacket = require('../../src/domain/entities/SOSPacket');
const { EventBus } = require('../../src/domain/events');

const createMockStoragePort = (existingIds = []) => ({
  packetExists: jest.fn(id => Promise.resolve(existingIds.includes(id))),
  savePacket: jest.fn().mockResolvedValue(true),
});

const createMockTransportPort = () => ({
  isRunning: jest.fn().mockReturnValue(true),
  sendPacket: jest.fn().mockResolvedValue(true),
});

describe('RelayPacketUseCase', () => {
  let storagePort, transportPort, eventBus, useCase;

  beforeEach(() => {
    storagePort = createMockStoragePort();
    transportPort = createMockTransportPort();
    eventBus = new EventBus();
    useCase = new RelayPacketUseCase(storagePort, transportPort, eventBus);
  });

  it('should relay a valid packet', async () => {
    const packet = new SOSPacket({
      senderDeviceId: 'original-sender',
      payload: { message: 'Help!' },
    });

    const result = await useCase.execute(packet.toJSON(), 'relay-device-1', {
      lat: 28.62,
      lng: 77.21,
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('RELAYED');
    expect(storagePort.savePacket).toHaveBeenCalledTimes(1);
    expect(transportPort.sendPacket).toHaveBeenCalledTimes(1);
  });

  it('should reject duplicate packets', async () => {
    const packet = new SOSPacket({
      packetId: 'existing-packet-id',
      payload: { message: 'Already seen' },
    });

    storagePort = createMockStoragePort(['existing-packet-id']);
    useCase = new RelayPacketUseCase(storagePort, transportPort, eventBus);

    const result = await useCase.execute(packet.toJSON(), 'relay-device');

    expect(result.success).toBe(true);
    expect(result.action).toBe('DUPLICATE_SKIPPED');
    expect(storagePort.savePacket).not.toHaveBeenCalled();
  });

  it('should reject expired packets', async () => {
    const packet = new SOSPacket({
      createdAt: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(),
      payload: { message: 'Old packet' },
    });

    const result = await useCase.execute(packet.toJSON(), 'relay-device');

    expect(result.success).toBe(false);
    expect(result.action).toBe('EXPIRED');
  });

  it('should reject packets at max hops', async () => {
    const packet = new SOSPacket({
      hopCount: 15,
      maxHops: 15,
      payload: { message: 'Too many hops' },
    });

    const result = await useCase.execute(packet.toJSON(), 'relay-device');

    expect(result.success).toBe(false);
    expect(result.action).toBe('MAX_HOPS');
  });

  it('should increment hop count on relay', async () => {
    const packet = new SOSPacket({
      hopCount: 3,
      payload: { message: 'Help!' },
    });

    await useCase.execute(packet.toJSON(), 'relay-device');

    // The saved packet should have hopCount = 4
    const savedPacket = storagePort.savePacket.mock.calls[0][0];
    expect(savedPacket.hopCount).toBe(4);
  });

  it('should emit PacketRelayedEvent', async () => {
    const listener = jest.fn();
    eventBus.on('PACKET_RELAYED', listener);

    const packet = new SOSPacket({ payload: { message: 'Help!' } });
    await useCase.execute(packet.toJSON(), 'relay-device');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
