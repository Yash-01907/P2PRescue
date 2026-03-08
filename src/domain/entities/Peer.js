// src/domain/entities/Peer.js
// Domain Entity: Represents a discovered peer device

class Peer {
  constructor({
    peerId = '',
    firstSeen = new Date().toISOString(),
    lastSeen = new Date().toISOString(),
    packetsExchanged = 0,
    signalStrength = 0,
    isConnected = false,
  } = {}) {
    this.peerId = peerId;
    this.firstSeen = firstSeen;
    this.lastSeen = lastSeen;
    this.packetsExchanged = packetsExchanged;
    this.signalStrength = signalStrength;
    this.isConnected = isConnected;
  }

  updateLastSeen() {
    this.lastSeen = new Date().toISOString();
  }

  incrementPackets() {
    this.packetsExchanged += 1;
    this.updateLastSeen();
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(json) {
    return new Peer(json);
  }
}

module.exports = Peer;
