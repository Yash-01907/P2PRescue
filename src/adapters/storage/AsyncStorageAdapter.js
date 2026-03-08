// src/adapters/storage/AsyncStorageAdapter.js
// Adapter: Implements StoragePort using @react-native-async-storage
const StoragePort = require('../../domain/ports/StoragePort');

class AsyncStorageAdapter extends StoragePort {
  constructor() {
    super();
    this._PACKETS_KEY = '@p2prescue_packets';
  }

  async _getStorage() {
    try {
      return require('@react-native-async-storage/async-storage').default;
    } catch {
      // Fallback to in-memory storage for testing
      return this._getInMemoryStorage();
    }
  }

  _getInMemoryStorage() {
    if (!this._memStore) {
      this._memStore = {};
    }
    return {
      getItem: async key => this._memStore[key] || null,
      setItem: async (key, value) => {
        this._memStore[key] = value;
      },
    };
  }

  async _getAllPackets() {
    const storage = await this._getStorage();
    const raw = await storage.getItem(this._PACKETS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  async _setAllPackets(packets) {
    const storage = await this._getStorage();
    await storage.setItem(this._PACKETS_KEY, JSON.stringify(packets));
  }

  async savePacket(packet) {
    const packets = await this._getAllPackets();
    // Dedup check
    const exists = packets.some(p => p.packetId === packet.packetId);
    if (!exists) {
      packets.push(packet);
      await this._setAllPackets(packets);
    }
    return true;
  }

  async getBufferedPackets(status = null) {
    const packets = await this._getAllPackets();
    if (status) {
      return packets.filter(p => p.status === status);
    }
    return packets;
  }

  async getPacketById(packetId) {
    const packets = await this._getAllPackets();
    return packets.find(p => p.packetId === packetId) || null;
  }

  async packetExists(packetId) {
    const packets = await this._getAllPackets();
    return packets.some(p => p.packetId === packetId);
  }

  async markAsForwarded(packetIds) {
    const packets = await this._getAllPackets();
    packets.forEach(p => {
      if (packetIds.includes(p.packetId)) {
        p.status = 'FORWARDED';
      }
    });
    await this._setAllPackets(packets);
  }

  async markAsDelivered(packetIds) {
    const packets = await this._getAllPackets();
    packets.forEach(p => {
      if (packetIds.includes(p.packetId)) {
        p.status = 'DELIVERED';
      }
    });
    await this._setAllPackets(packets);
  }

  async purgeExpired() {
    const packets = await this._getAllPackets();
    const now = Date.now();
    const filtered = packets.filter(p => {
      const created = new Date(p.createdAt).getTime();
      const ttlMs = (p.ttlHours || 72) * 60 * 60 * 1000;
      return now - created < ttlMs;
    });
    await this._setAllPackets(filtered);
    return packets.length - filtered.length; // Return count of purged
  }

  async getPacketCounts() {
    const packets = await this._getAllPackets();
    return {
      total: packets.length,
      pending: packets.filter(p => p.status === 'PENDING').length,
      forwarded: packets.filter(p => p.status === 'FORWARDED').length,
      delivered: packets.filter(p => p.status === 'DELIVERED').length,
    };
  }
}

module.exports = AsyncStorageAdapter;
