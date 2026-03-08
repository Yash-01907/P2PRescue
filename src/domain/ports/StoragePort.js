// src/domain/ports/StoragePort.js
// Port Interface: Defines local packet storage contract

class StoragePort {
  /** Save an SOS packet to local buffer */
  async savePacket(packet) {
    throw new Error('StoragePort.savePacket() not implemented');
  }

  /** Get all buffered packets (optionally filtered by status) */
  async getBufferedPackets(status = null) {
    throw new Error('StoragePort.getBufferedPackets() not implemented');
  }

  /** Get a single packet by ID */
  async getPacketById(packetId) {
    throw new Error('StoragePort.getPacketById() not implemented');
  }

  /** Check if a packet ID already exists (deduplication) */
  async packetExists(packetId) {
    throw new Error('StoragePort.packetExists() not implemented');
  }

  /** Mark packets as forwarded */
  async markAsForwarded(packetIds) {
    throw new Error('StoragePort.markAsForwarded() not implemented');
  }

  /** Mark packets as delivered to the dashboard */
  async markAsDelivered(packetIds) {
    throw new Error('StoragePort.markAsDelivered() not implemented');
  }

  /** Purge packets that have exceeded their TTL */
  async purgeExpired() {
    throw new Error('StoragePort.purgeExpired() not implemented');
  }

  /** Delete obsolete location caches, peer logs, and relay records based on Retention Policy */
  async purgeStaleLogs() {
    throw new Error('StoragePort.purgeStaleLogs() not implemented');
  }

  /** Get count of packets by status */
  async getPacketCounts() {
    throw new Error('StoragePort.getPacketCounts() not implemented');
  }
}

module.exports = StoragePort;
