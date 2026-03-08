// src/domain/events/index.js
// Domain Events — emitted by entities and consumed by use cases

/**
 * Event: A new SOS packet was created by this device.
 */
class SOSCreatedEvent {
  constructor(packetId, createdAt = new Date().toISOString()) {
    this.type = 'SOS_CREATED';
    this.packetId = packetId;
    this.createdAt = createdAt;
  }
}

/**
 * Event: A new peer was discovered on the mesh network.
 */
class PeerDiscoveredEvent {
  constructor(peerId, signalStrength = 0) {
    this.type = 'PEER_DISCOVERED';
    this.peerId = peerId;
    this.signalStrength = signalStrength;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Event: A packet was successfully relayed to a peer.
 */
class PacketRelayedEvent {
  constructor(packetId, relayedTo) {
    this.type = 'PACKET_RELAYED';
    this.packetId = packetId;
    this.relayedTo = relayedTo;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Event: A packet was delivered to the dashboard backend.
 */
class PacketDeliveredEvent {
  constructor(packetId) {
    this.type = 'PACKET_DELIVERED';
    this.packetId = packetId;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Event: Cell signal was restored (offline → online transition).
 */
class CellSignalRestoredEvent {
  constructor() {
    this.type = 'CELL_SIGNAL_RESTORED';
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Simple event bus for domain events.
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
  }

  emit(event) {
    const callbacks = this.listeners[event.type] || [];
    callbacks.forEach(cb => cb(event));
  }

  off(eventType, callback) {
    if (!this.listeners[eventType]) return;
    this.listeners[eventType] = this.listeners[eventType].filter(
      cb => cb !== callback,
    );
  }
}

module.exports = {
  SOSCreatedEvent,
  PeerDiscoveredEvent,
  PacketRelayedEvent,
  PacketDeliveredEvent,
  CellSignalRestoredEvent,
  EventBus,
};
