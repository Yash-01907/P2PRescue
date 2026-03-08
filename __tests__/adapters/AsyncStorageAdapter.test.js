// __tests__/adapters/AsyncStorageAdapter.test.js
// Integration test for AsyncStorageAdapter (uses in-memory fallback)
const AsyncStorageAdapter = require('../../src/adapters/storage/AsyncStorageAdapter');
const SOSPacket = require('../../src/domain/entities/SOSPacket');

describe('AsyncStorageAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new AsyncStorageAdapter();
  });

  describe('savePacket', () => {
    it('should save a packet', async () => {
      const packet = new SOSPacket({ payload: { message: 'Test' } });
      await adapter.savePacket(packet.toJSON());

      const packets = await adapter.getBufferedPackets();
      expect(packets).toHaveLength(1);
      expect(packets[0].payload.message).toBe('Test');
    });

    it('should deduplicate by packetId', async () => {
      const packet = new SOSPacket({
        packetId: 'dup-123',
        payload: { message: 'First' },
      });
      await adapter.savePacket(packet.toJSON());
      await adapter.savePacket(packet.toJSON());

      const packets = await adapter.getBufferedPackets();
      expect(packets).toHaveLength(1);
    });
  });

  describe('packetExists', () => {
    it('should detect existing packets', async () => {
      const packet = new SOSPacket({
        packetId: 'exists-123',
        payload: { message: 'Hi' },
      });
      await adapter.savePacket(packet.toJSON());

      expect(await adapter.packetExists('exists-123')).toBe(true);
      expect(await adapter.packetExists('nonexistent')).toBe(false);
    });
  });

  describe('status management', () => {
    it('should mark packets as forwarded', async () => {
      const p1 = new SOSPacket({ packetId: 'fwd-1', payload: { message: '' } });
      const p2 = new SOSPacket({ packetId: 'fwd-2', payload: { message: '' } });
      await adapter.savePacket(p1.toJSON());
      await adapter.savePacket(p2.toJSON());

      await adapter.markAsForwarded(['fwd-1']);

      const forwarded = await adapter.getBufferedPackets('FORWARDED');
      expect(forwarded).toHaveLength(1);
      expect(forwarded[0].packetId).toBe('fwd-1');
    });

    it('should mark packets as delivered', async () => {
      const p = new SOSPacket({ packetId: 'del-1', payload: { message: '' } });
      await adapter.savePacket(p.toJSON());
      await adapter.markAsDelivered(['del-1']);

      const delivered = await adapter.getBufferedPackets('DELIVERED');
      expect(delivered).toHaveLength(1);
    });
  });

  describe('purgeExpired', () => {
    it('should remove expired packets', async () => {
      const fresh = new SOSPacket({
        packetId: 'fresh',
        payload: { message: '' },
      });
      const expired = new SOSPacket({
        packetId: 'expired',
        createdAt: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(),
        ttlHours: 72,
        payload: { message: '' },
      });

      await adapter.savePacket(fresh.toJSON());
      await adapter.savePacket(expired.toJSON());

      const purged = await adapter.purgeExpired();
      expect(purged).toBe(1);

      const remaining = await adapter.getBufferedPackets();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].packetId).toBe('fresh');
    });
  });

  describe('getPacketCounts', () => {
    it('should return correct counts', async () => {
      const p1 = new SOSPacket({ packetId: 'c1', payload: { message: '' } });
      const p2 = new SOSPacket({ packetId: 'c2', payload: { message: '' } });
      await adapter.savePacket(p1.toJSON());
      await adapter.savePacket(p2.toJSON());
      await adapter.markAsDelivered(['c2']);

      const counts = await adapter.getPacketCounts();
      expect(counts.total).toBe(2);
      expect(counts.pending).toBe(1);
      expect(counts.delivered).toBe(1);
    });
  });
});
