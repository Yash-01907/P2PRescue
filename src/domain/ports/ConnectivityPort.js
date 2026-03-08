// src/domain/ports/ConnectivityPort.js
// Port Interface: Defines network connectivity monitoring contract

class ConnectivityPort {
  /** Check if the device currently has cellular/Wi-Fi internet access */
  async hasCellSignal() {
    throw new Error('ConnectivityPort.hasCellSignal() not implemented');
  }

  /**
   * Register callback for connectivity changes.
   * @param {function} callback - (isConnected: boolean) => void
   */
  onConnectivityChanged(callback) {
    throw new Error('ConnectivityPort.onConnectivityChanged() not implemented');
  }

  /** Unregister connectivity listener */
  removeConnectivityListener() {
    throw new Error(
      'ConnectivityPort.removeConnectivityListener() not implemented',
    );
  }
}

module.exports = ConnectivityPort;
