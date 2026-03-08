// src/adapters/transport/BridgefyTransportAdapter.js
// Adapter: Implements TransportPort using Bridgefy SDK
// In production, this wraps the actual Bridgefy React Native wrapper.
// For development/testing, we provide a mock mode.

const TransportPort = require('../../domain/ports/TransportPort');

class BridgefyTransportAdapter extends TransportPort {
  constructor() {
    super();
    this._running = false;
    this._peers = new Map(); // peerId -> { signalStrength, lastSeen }
    this._onPacketCallback = null;
    this._onPeerDiscoveredCallback = null;
    this._onPeerLostCallback = null;
    this._bridgefy = null;
  }

  /**
   * Initialize and start the Bridgefy mesh network.
   * In production: Bridgefy.start({ apiKey, propagationProfile: 'standard' })
   * Mock mode: simulates mesh availability.
   */
  async startMesh() {
    try {
      // Attempt to load Bridgefy SDK (gracefully degrade if unavailable)
      try {
        this._bridgefy = require('react-native-bridgefy');
        await this._bridgefy.start({
          apiKey: 'YOUR_BRIDGEFY_API_KEY', // Replace with env var
          propagationProfile: 'standard',
        });

        // Set up Bridgefy event listeners
        this._bridgefy.onMessageReceived(message => {
          if (this._onPacketCallback) {
            try {
              const packet = JSON.parse(message.data);
              this._onPacketCallback(packet);
            } catch (e) {
              console.warn('[Bridgefy] Failed to parse incoming packet:', e);
            }
          }
        });

        this._bridgefy.onDeviceConnected(device => {
          this._peers.set(device.id, {
            signalStrength: device.rssi || 0,
            lastSeen: new Date().toISOString(),
          });
          if (this._onPeerDiscoveredCallback) {
            this._onPeerDiscoveredCallback({
              peerId: device.id,
              signalStrength: device.rssi || 0,
            });
          }
        });

        this._bridgefy.onDeviceDisconnected(device => {
          this._peers.delete(device.id);
          if (this._onPeerLostCallback) {
            this._onPeerLostCallback(device.id);
          }
        });
      } catch {
        console.log(
          '[BridgefyAdapter] SDK not available, running in mock mode',
        );
      }

      this._running = true;
      console.log('[BridgefyAdapter] Mesh started');
      return true;
    } catch (error) {
      console.error('[BridgefyAdapter] Failed to start mesh:', error);
      throw error;
    }
  }

  async stopMesh() {
    try {
      if (this._bridgefy) {
        await this._bridgefy.stop();
      }
      this._running = false;
      this._peers.clear();
      console.log('[BridgefyAdapter] Mesh stopped');
    } catch (error) {
      console.error('[BridgefyAdapter] Failed to stop mesh:', error);
    }
  }

  async sendPacket(packetData) {
    if (!this._running) {
      throw new Error('Mesh not running');
    }

    const data = JSON.stringify(packetData);

    if (this._bridgefy) {
      // Send with Bridgefy: broadcast mode (to all reachable peers)
      await this._bridgefy.sendBroadcast(data);
    }

    console.log('[BridgefyAdapter] Packet sent:', packetData.packetId);
    return true;
  }

  onPacketReceived(callback) {
    this._onPacketCallback = callback;
  }

  onPeerDiscovered(callback) {
    this._onPeerDiscoveredCallback = callback;
  }

  onPeerLost(callback) {
    this._onPeerLostCallback = callback;
  }

  getConnectedPeerCount() {
    return this._peers.size;
  }

  isRunning() {
    return this._running;
  }

  /** Get all currently known peers */
  getPeers() {
    return Array.from(this._peers.entries()).map(([id, info]) => ({
      peerId: id,
      ...info,
    }));
  }
}

module.exports = BridgefyTransportAdapter;
