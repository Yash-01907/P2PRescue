// src/adapters/network/NetInfoConnectivityAdapter.js
// Adapter: Implements ConnectivityPort using @react-native-community/netinfo
const ConnectivityPort = require('../../domain/ports/ConnectivityPort');

class NetInfoConnectivityAdapter extends ConnectivityPort {
  constructor() {
    super();
    this._unsubscribe = null;
    this._isConnected = false;
  }

  async hasCellSignal() {
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      const state = await NetInfo.fetch();
      this._isConnected = state.isConnected && state.isInternetReachable;
      return this._isConnected;
    } catch {
      // Fallback: assume no signal when NetInfo unavailable
      return false;
    }
  }

  onConnectivityChanged(callback) {
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      this._unsubscribe = NetInfo.addEventListener(state => {
        const wasConnected = this._isConnected;
        this._isConnected = state.isConnected && state.isInternetReachable;

        // Only trigger on actual transitions
        if (this._isConnected !== wasConnected) {
          callback(this._isConnected);
        }
      });
    } catch {
      console.warn('[NetInfoAdapter] NetInfo not available');
    }
  }

  removeConnectivityListener() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }
}

module.exports = NetInfoConnectivityAdapter;
