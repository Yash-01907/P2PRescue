// src/domain/entities/SOSPacket.js
// Domain Entity: Core SOS packet - ZERO framework dependencies

// Simple UUID v4 generator — no external dependency needed
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
class SOSPacket {
  constructor({
    packetId = generateUUID(),
    version = 1,
    type = 'SOS',
    priority = 'CRITICAL',
    createdAt = new Date().toISOString(),
    ttlHours = 72,
    hopCount = 0,
    maxHops = 15,
    senderDeviceId = '',
    location = null,
    payload = {},
    relayChain = [],
    checksum = '',
    status = 'PENDING', // PENDING | FORWARDED | DELIVERED
  } = {}) {
    this.packetId = packetId;
    this.version = version;
    this.type = type;
    this.priority = priority;
    this.createdAt = createdAt;
    this.ttlHours = ttlHours;
    this.hopCount = hopCount;
    this.maxHops = maxHops;
    this.senderDeviceId = senderDeviceId;
    this.location = location;
    this.payload = payload;
    this.relayChain = relayChain;
    this.checksum = checksum;
    this.status = status;
  }

  /**
   * Business rule: Is this packet expired based on TTL?
   */
  isExpired() {
    const createdTime = new Date(this.createdAt).getTime();
    const ttlMs = this.ttlHours * 60 * 60 * 1000;
    return Date.now() - createdTime > ttlMs;
  }

  /**
   * Business rule: Can this packet be relayed further?
   * Must not be expired and must not exceed max hops.
   */
  canRelay() {
    return !this.isExpired() && this.hopCount < this.maxHops;
  }

  /**
   * Add a relay hop to the chain when forwarding through a peer.
   * @param {string} deviceId - The relay device's hashed ID
   * @param {object|null} relayLocation - lat/lng of the relay device
   */
  addRelayHop(deviceId, relayLocation = null) {
    if (!this.canRelay()) {
      throw new Error('Packet cannot be relayed: expired or max hops reached');
    }
    this.hopCount += 1;
    this.relayChain.push({
      deviceId,
      relayedAt: new Date().toISOString(),
      relayLocation,
    });
  }

  /**
   * Mark packet as forwarded (keep local copy for further relay).
   */
  markAsForwarded() {
    this.status = 'FORWARDED';
  }

  /**
   * Mark packet as delivered to the dashboard backend.
   */
  markAsDelivered() {
    this.status = 'DELIVERED';
  }

  toJSON() {
    let computedLocation = this.location;
    // Inject staleness_seconds dynamically if it's a cached location
    if (computedLocation && computedLocation.timestamp) {
      computedLocation = {
        ...computedLocation,
        staleness_seconds: Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(computedLocation.timestamp).getTime()) /
              1000,
          ),
        ),
      };
    }

    return {
      packetId: this.packetId,
      version: this.version,
      type: this.type,
      priority: this.priority,
      createdAt: this.createdAt,
      ttlHours: this.ttlHours,
      hopCount: this.hopCount,
      maxHops: this.maxHops,
      senderDeviceId: this.senderDeviceId,
      location: computedLocation,
      payload: this.payload,
      relayChain: this.relayChain,
      checksum: this.checksum,
      status: this.status,
    };
  }

  /**
   * Reconstruct from a plain JSON object.
   */
  static fromJSON(json) {
    return new SOSPacket(json);
  }
}

module.exports = SOSPacket;
