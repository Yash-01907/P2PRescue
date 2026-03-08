// src/domain/valueobjects/DeviceId.js
// Value Object: Immutable SHA-256 hashed device identity
const CryptoJS = require('crypto-js');

class DeviceId {
  constructor(rawId) {
    if (!rawId) throw new Error('DeviceId requires a raw identifier');
    this.value = CryptoJS.SHA256(rawId).toString();
  }

  equals(other) {
    return other instanceof DeviceId && this.value === other.value;
  }

  toString() {
    return this.value;
  }
}

module.exports = DeviceId;
