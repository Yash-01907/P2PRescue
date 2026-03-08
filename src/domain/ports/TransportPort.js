// src/domain/ports/TransportPort.js
// Port Interface: Defines mesh networking contract
// Adapters: BridgefyTransportAdapter

/**
 * TransportPort — Interface for mesh networking transport.
 * All methods must be implemented by the adapter.
 * Domain core calls these without knowing if it's BLE, Wi-Fi Direct, or Bridgefy.
 */
class TransportPort {
  /** Start the mesh network (advertising + scanning) */
  async startMesh() {
    throw new Error('TransportPort.startMesh() not implemented');
  }

  /** Stop the mesh network */
  async stopMesh() {
    throw new Error('TransportPort.stopMesh() not implemented');
  }

  /** Send a packet to the mesh (broadcast or targeted) */
  async sendPacket(packetData) {
    throw new Error('TransportPort.sendPacket() not implemented');
  }

  /**
   * Register callback for incoming packets.
   * @param {function} callback - (packet: object) => void
   */
  onPacketReceived(callback) {
    throw new Error('TransportPort.onPacketReceived() not implemented');
  }

  /**
   * Register callback for peer discovery.
   * @param {function} callback - (peer: {peerId, signalStrength}) => void
   */
  onPeerDiscovered(callback) {
    throw new Error('TransportPort.onPeerDiscovered() not implemented');
  }

  /**
   * Register callback for peer disconnection.
   * @param {function} callback - (peerId: string) => void
   */
  onPeerLost(callback) {
    throw new Error('TransportPort.onPeerLost() not implemented');
  }

  /** Get count of currently connected peers */
  getConnectedPeerCount() {
    throw new Error('TransportPort.getConnectedPeerCount() not implemented');
  }

  /** Check if mesh is currently running */
  isRunning() {
    throw new Error('TransportPort.isRunning() not implemented');
  }
}

module.exports = TransportPort;
