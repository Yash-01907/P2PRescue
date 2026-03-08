// src/adapters/transport/BridgefyTransportAdapter.js
// Adapter: Implements TransportPort using Bridgefy SDK
// ADR-007: Primary offline transport mechanism

const TransportPort = require('../../domain/ports/TransportPort');
import {
  BridgefyClient,
  BridgefyMessageListener,
  BridgefyStateListener,
} from 'bridgefy-react-native';

class BridgefyTransportAdapter extends TransportPort {
  constructor(apiKey = 'YOUR_BRIDGEFY_API_KEY') {
    super();
    this.apiKey = apiKey;
    this.callbacks = {
      onPeerDiscovered: [],
      onPacketReceived: [],
      onPacketDelivered: [],
    };
    this.isRunning = false;
    this.mockMode = false;
    this._peers = new Map();
  }

  async init() {
    try {
      console.log(
        '[BridgefyAdapter] Initializing native Bridgefy SDK with API key...',
      );
      await BridgefyClient.initialize(this.apiKey);

      BridgefyStateListener.onStarted(() => {
        this.isRunning = true;
        console.log('[BridgefyAdapter] Bridgefy SDK Started successfully.');
      });

      BridgefyStateListener.onStartError(error => {
        console.error('[BridgefyAdapter] Failed to start:', error);
      });

      BridgefyMessageListener.onMessageReceived(message => {
        this._handleIncomingMessage(message);
      });

      console.log('[BridgefyAdapter] Initialization complete.');
      return true;
    } catch (e) {
      console.warn(
        '[BridgefyAdapter] Native module failed, falling back to MOCK mode:',
        e.message,
      );
      this.mockMode = true;
      return true;
    }
  }

  async startMesh() {
    return this.start();
  }

  async start() {
    if (this.mockMode) {
      this.isRunning = true;
      console.log('[BridgefyAdapter] Started in MOCK mode.');
      this._startMockSimulation();
      return true;
    }

    console.log('[BridgefyAdapter] Starting mesh radio...');
    await BridgefyClient.start();
    return true;
  }

  async stopMesh() {
    return this.stop();
  }

  async stop() {
    this.isRunning = false;
    if (this.mockMode) {
      console.log('[BridgefyAdapter] Stopped MOCK mode.');
      return;
    }
    await BridgefyClient.stop();
  }

  async sendPacket(packetData) {
    if (!this.isRunning) throw new Error('Transport not started');

    if (this.mockMode) {
      console.log(
        `[BridgefyAdapter-MOCK] Broadcasting packet: ${packetData.packetId}`,
      );
      setTimeout(() => {
        this._notify('onPacketDelivered', packetData.packetId);
      }, 500);
      return true;
    }

    // Real Bridgefy broadcast
    try {
      const message = {
        content: packetData,
      };
      await BridgefyClient.sendBroadcastMessage(message);
      this._notify('onPacketDelivered', packetData.packetId);
      return true;
    } catch (error) {
      console.error('[BridgefyAdapter] Failed to send packet:', error);
      return false;
    }
  }

  // Backward compatibility with TransportPort signatures
  onPacketReceived(callback) {
    this.on('onPacketReceived', callback);
  }

  onPeerDiscovered(callback) {
    this.on('onPeerDiscovered', callback);
  }

  onPeerLost(callback) {
    // Basic wrapper
  }

  getConnectedPeerCount() {
    return this._peers.size;
  }

  getPeers() {
    return [];
  }

  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(
        cb => cb !== callback,
      );
    }
  }

  _notify(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  _handleIncomingMessage(message) {
    try {
      const packetData = message.content;
      console.log(
        `[BridgefyAdapter] Received packet over mesh: ${packetData.packetId}`,
      );
      this._notify('onPacketReceived', packetData);
    } catch (e) {
      console.error('[BridgefyAdapter] Error parsing incoming message', e);
    }
  }

  // --- MOCK SIMULATION LOGIC ---
  _startMockSimulation() {
    setInterval(() => {
      if (!this.isRunning) return;
      if (Math.random() > 0.8) {
        const peerId = 'peer_' + Math.floor(Math.random() * 1000);
        this._peers.set(peerId, { lastSeen: Date.now() });
        this._notify('onPeerDiscovered', { peerId, signalStrength: -50 });
      }
    }, 10000);

    setInterval(() => {
      if (!this.isRunning) return;
      if (Math.random() > 0.95) {
        const mPacket = {
          packetId: `sim_${Date.now()}`,
          payload: { message: 'Help, stranded!', injuredCount: 1 },
          createdAt: new Date().toISOString(),
          hopCount: 1,
          location: { latitude: 28.6139, longitude: 77.209, source: 'GPS' },
        };
        this._notify('onPacketReceived', mPacket);
      }
    }, 20000);
  }
}

module.exports = BridgefyTransportAdapter;
