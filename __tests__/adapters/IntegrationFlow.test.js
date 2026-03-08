// __tests__/adapters/IntegrationFlow.test.js
// End-to-end integration test: SOS creation > storage > relay > sync
const SOSPacket = require('../../src/domain/entities/SOSPacket');
const Location = require('../../src/domain/entities/Location');
const AsyncStorageAdapter = require('../../src/adapters/storage/AsyncStorageAdapter');
const CryptoAdapter = require('../../src/adapters/encryption/CryptoAdapter');
const CreateSOSUseCase = require('../../src/usecases/CreateSOSUseCase');
const RelayPacketUseCase = require('../../src/usecases/RelayPacketUseCase');
const { EventBus } = require('../../src/domain/events');

describe('Integration: Full SOS Lifecycle', () => {
  let eventBus, crypto;

  const mockTransport = {
    isRunning: () => true,
    sendPacket: jest.fn().mockResolvedValue(true),
  };
  const liveLocation = new Location({
    latitude: 28.6139,
    longitude: 77.209,
    accuracy: 10,
    source: 'GPS_LIVE',
  });
  const mockLocation = {
    getBestLocation: jest.fn().mockResolvedValue(liveLocation),
  };

  beforeEach(() => {
    eventBus = new EventBus();
    crypto = new CryptoAdapter('integration-test-key');
    mockTransport.sendPacket.mockClear();
  });

  it('should create, relay through 3 devices, and preserve data', async () => {
    // Each device has its own storage (simulates separate phones)
    const storageA = new AsyncStorageAdapter();
    const storageB = new AsyncStorageAdapter();
    const storageC = new AsyncStorageAdapter();

    // DEVICE A: Create SOS
    const createUseCase = new CreateSOSUseCase(
      mockLocation,
      storageA,
      mockTransport,
      eventBus,
    );
    const createResult = await createUseCase.execute({
      message: '3 survivors trapped, building collapsed',
      injuredCount: 1,
      waterAvailable: false,
      batteryPercent: 42,
      deviceId: 'device-A-hash',
    });

    expect(createResult.success).toBe(true);
    expect(createResult.packet.hopCount).toBe(0);
    expect(createResult.packet.location.source).toBe('GPS_LIVE');

    // DEVICE B: Receive via mesh and relay
    const relayB = new RelayPacketUseCase(storageB, mockTransport, eventBus);
    const resultB = await relayB.execute(createResult.packet, 'device-B-hash', {
      lat: 28.62,
      lng: 77.21,
    });
    expect(resultB.success).toBe(true);
    expect(resultB.action).toBe('RELAYED');

    // Get relayed packet from B's storage
    const bPackets = await storageB.getBufferedPackets();
    expect(bPackets).toHaveLength(1);
    expect(bPackets[0].hopCount).toBe(1);

    // DEVICE C: Receive from B and relay
    const relayC = new RelayPacketUseCase(storageC, mockTransport, eventBus);
    const resultC = await relayC.execute(bPackets[0], 'device-C-hash', {
      lat: 28.63,
      lng: 77.22,
    });
    expect(resultC.success).toBe(true);
    expect(resultC.action).toBe('RELAYED');

    // Verify final packet on Device C
    const cPackets = await storageC.getBufferedPackets();
    const finalPacket = cPackets[0];
    expect(finalPacket.hopCount).toBe(2);
    expect(finalPacket.relayChain).toHaveLength(2);
    expect(finalPacket.relayChain[0].deviceId).toBe('device-B-hash');
    expect(finalPacket.relayChain[1].deviceId).toBe('device-C-hash');
    expect(finalPacket.senderDeviceId).toBe('device-A-hash');
    expect(finalPacket.payload.message).toBe(
      '3 survivors trapped, building collapsed',
    );
  });

  it('should deduplicate when the same packet arrives twice', async () => {
    const storage = new AsyncStorageAdapter();
    const packet = new SOSPacket({
      packetId: 'dedup-integration-test',
      senderDeviceId: 'device-X',
      payload: { message: 'Help!' },
    });

    const relayUseCase = new RelayPacketUseCase(
      storage,
      mockTransport,
      eventBus,
    );

    const first = await relayUseCase.execute(packet.toJSON(), 'relay-1');
    expect(first.action).toBe('RELAYED');

    const second = await relayUseCase.execute(packet.toJSON(), 'relay-2');
    expect(second.action).toBe('DUPLICATE_SKIPPED');

    const count = await storage.getPacketCounts();
    expect(count.total).toBe(1);
  });

  it('should encrypt and decrypt SOS payload end-to-end', () => {
    const payload = {
      message: 'Trapped under rubble',
      injuredCount: 2,
      waterAvailable: true,
      batteryPercent: 15,
    };

    const encrypted = crypto.encrypt(payload);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toContain('Trapped');

    const decrypted = crypto.decrypt(encrypted);
    expect(decrypted).toEqual(payload);
  });

  it('should reject expired packets in relay', async () => {
    const storage = new AsyncStorageAdapter();
    const oldPacket = new SOSPacket({
      createdAt: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(),
      ttlHours: 72,
      payload: { message: 'Very old SOS' },
    });

    const relayUseCase = new RelayPacketUseCase(
      storage,
      mockTransport,
      eventBus,
    );
    const result = await relayUseCase.execute(
      oldPacket.toJSON(),
      'relay-device',
    );

    expect(result.success).toBe(false);
    expect(result.action).toBe('EXPIRED');
  });

  it('should purge expired packets from storage', async () => {
    const storage = new AsyncStorageAdapter();
    const fresh = new SOSPacket({
      packetId: 'fresh-1',
      payload: { message: 'New' },
    });
    const expired = new SOSPacket({
      packetId: 'old-1',
      createdAt: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(),
      ttlHours: 72,
      payload: { message: 'Old' },
    });

    await storage.savePacket(fresh.toJSON());
    await storage.savePacket(expired.toJSON());

    const purged = await storage.purgeExpired();
    expect(purged).toBe(1);

    const remaining = await storage.getBufferedPackets();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].packetId).toBe('fresh-1');
  });
});
