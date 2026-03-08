// src/domain/valueobjects/PacketId.js
// Value Object: UUID v4 wrapper for packet identification
const { v4: uuidv4 } = require('uuid');

class PacketId {
  constructor(value = null) {
    this.value = value || uuidv4();
  }

  equals(other) {
    return other instanceof PacketId && this.value === other.value;
  }

  toString() {
    return this.value;
  }
}

module.exports = PacketId;
