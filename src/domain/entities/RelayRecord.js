// src/domain/entities/RelayRecord.js
// Domain Entity: Record of a packet relay event

class RelayRecord {
  constructor({
    relayId = '',
    packetId = '',
    relayedTo = '',
    relayedAt = new Date().toISOString(),
    relayLocation = null,
  } = {}) {
    this.relayId = relayId;
    this.packetId = packetId;
    this.relayedTo = relayedTo;
    this.relayedAt = relayedAt;
    this.relayLocation = relayLocation;
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(json) {
    return new RelayRecord(json);
  }
}

module.exports = RelayRecord;
