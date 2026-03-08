// __tests__/domain/SOSPacket.test.js
// Unit Tests for SOSPacket domain entity

const SOSPacket = require('../../src/domain/entities/SOSPacket');

describe('SOSPacket', () => {
  let packet;

  beforeEach(() => {
    packet = new SOSPacket({
      senderDeviceId: 'test-device-123',
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        accuracy: 10,
        source: 'GPS_LIVE',
      },
      payload: {
        message: 'Trapped under rubble, 3 survivors',
        injuredCount: 1,
        waterAvailable: false,
        batteryPercent: 34,
      },
    });
  });

  describe('constructor', () => {
    it('should create a valid SOS packet with defaults', () => {
      expect(packet.packetId).toBeDefined();
      expect(packet.type).toBe('SOS');
      expect(packet.priority).toBe('CRITICAL');
      expect(packet.ttlHours).toBe(72);
      expect(packet.hopCount).toBe(0);
      expect(packet.maxHops).toBe(15);
      expect(packet.status).toBe('PENDING');
    });

    it('should create with default values when no args', () => {
      const defaultPacket = new SOSPacket();
      expect(defaultPacket.packetId).toBeDefined();
      expect(defaultPacket.hopCount).toBe(0);
      expect(defaultPacket.relayChain).toEqual([]);
    });
  });

  describe('isExpired()', () => {
    it('should return false for a fresh packet', () => {
      expect(packet.isExpired()).toBe(false);
    });

    it('should return true when TTL has passed', () => {
      // Set createdAt to 73 hours ago
      const pastDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
      packet.createdAt = pastDate.toISOString();
      expect(packet.isExpired()).toBe(true);
    });

    it('should return false when just under TTL', () => {
      // Set createdAt to 71 hours ago
      const pastDate = new Date(Date.now() - 71 * 60 * 60 * 1000);
      packet.createdAt = pastDate.toISOString();
      expect(packet.isExpired()).toBe(false);
    });
  });

  describe('canRelay()', () => {
    it('should return true for a fresh packet with low hop count', () => {
      expect(packet.canRelay()).toBe(true);
    });

    it('should return false when hop count equals max hops', () => {
      packet.hopCount = 15;
      expect(packet.canRelay()).toBe(false);
    });

    it('should return false when hop count exceeds max hops', () => {
      packet.hopCount = 20;
      expect(packet.canRelay()).toBe(false);
    });

    it('should return false when packet is expired', () => {
      const pastDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
      packet.createdAt = pastDate.toISOString();
      expect(packet.canRelay()).toBe(false);
    });
  });

  describe('addRelayHop()', () => {
    it('should increment hop count and add to relay chain', () => {
      packet.addRelayHop('relay-device-1', { lat: 28.62, lng: 77.21 });
      expect(packet.hopCount).toBe(1);
      expect(packet.relayChain).toHaveLength(1);
      expect(packet.relayChain[0].deviceId).toBe('relay-device-1');
      expect(packet.relayChain[0].relayLocation).toEqual({
        lat: 28.62,
        lng: 77.21,
      });
    });

    it('should allow multiple relay hops', () => {
      packet.addRelayHop('device-1');
      packet.addRelayHop('device-2');
      packet.addRelayHop('device-3');
      expect(packet.hopCount).toBe(3);
      expect(packet.relayChain).toHaveLength(3);
    });

    it('should throw when max hops reached', () => {
      packet.hopCount = 15;
      expect(() => packet.addRelayHop('overflow')).toThrow(
        'Packet cannot be relayed',
      );
    });

    it('should throw when packet is expired', () => {
      const pastDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
      packet.createdAt = pastDate.toISOString();
      expect(() => packet.addRelayHop('too-late')).toThrow(
        'Packet cannot be relayed',
      );
    });
  });

  describe('status transitions', () => {
    it('should mark as forwarded', () => {
      packet.markAsForwarded();
      expect(packet.status).toBe('FORWARDED');
    });

    it('should mark as delivered', () => {
      packet.markAsDelivered();
      expect(packet.status).toBe('DELIVERED');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON and back', () => {
      const json = packet.toJSON();
      const restored = SOSPacket.fromJSON(json);
      expect(restored.packetId).toBe(packet.packetId);
      expect(restored.payload.message).toBe(packet.payload.message);
      expect(restored.senderDeviceId).toBe(packet.senderDeviceId);
    });

    it('should preserve location data through serialization', () => {
      const json = packet.toJSON();
      const restored = SOSPacket.fromJSON(json);
      expect(restored.location.latitude).toBe(28.6139);
      expect(restored.location.source).toBe('GPS_LIVE');
    });
  });
});
