// src/services/MeshForegroundService.js
// Android Foreground Service wrapper to keep mesh alive when screen is off.
// Uses a persistent notification to prevent OS from killing the app.

const { AppState, Platform } = require('react-native');

class MeshForegroundService {
  constructor(transportAdapter, locationAdapter) {
    this._transportAdapter = transportAdapter;
    this._locationAdapter = locationAdapter;
    this._isActive = false;
    this._appStateSubscription = null;
  }

  /**
   * Start the foreground service (Android only).
   * Creates a persistent notification and starts the mesh.
   */
  async start() {
    if (Platform.OS !== 'android') {
      // iOS: Use Background Modes (bluetooth, location) instead
      console.log('[ForegroundService] iOS — using Background Modes');
      await this._startMeshAndCaching();
      return;
    }

    try {
      // Start the persistent notification (Android Foreground Service)
      // In production, use: @supersami/rn-foreground-service
      try {
        const VIForegroundService =
          require('@voximplant/react-native-foreground-service').default;
        const channelConfig = {
          id: 'p2p_rescue_mesh',
          name: 'P2P Rescue Mesh',
          description: 'Keeping mesh network alive for emergency communication',
          importance: 3, // DEFAULT
          enableVibration: false,
        };
        await VIForegroundService.getInstance().createNotificationChannel(
          channelConfig,
        );

        const notificationConfig = {
          channelId: 'p2p_rescue_mesh',
          id: 1,
          title: '📡 P2P Rescue Active',
          text: 'Mesh network is running. You are reachable.',
          icon: 'ic_notification',
          priority: 1,
        };
        await VIForegroundService.getInstance().startService(
          notificationConfig,
        );
      } catch {
        console.log(
          '[ForegroundService] Notification service not available (dev mode)',
        );
      }

      await this._startMeshAndCaching();
      this._isActive = true;

      // Monitor app state transitions
      this._appStateSubscription = AppState.addEventListener(
        'change',
        this._handleAppState.bind(this),
      );

      console.log('[ForegroundService] Started');
    } catch (error) {
      console.error('[ForegroundService] Start failed:', error);
      throw error;
    }
  }

  async stop() {
    try {
      await this._transportAdapter.stopMesh();
      await this._locationAdapter.stopCaching();

      if (Platform.OS === 'android') {
        try {
          const VIForegroundService =
            require('@voximplant/react-native-foreground-service').default;
          await VIForegroundService.getInstance().stopService();
        } catch {
          /* dev mode */
        }
      }

      if (this._appStateSubscription) {
        this._appStateSubscription.remove();
      }

      this._isActive = false;
      console.log('[ForegroundService] Stopped');
    } catch (error) {
      console.error('[ForegroundService] Stop failed:', error);
    }
  }

  async _startMeshAndCaching() {
    await this._transportAdapter.startMesh();
    await this._locationAdapter.startCaching(300000); // 5 min intervals
  }

  _handleAppState(nextState) {
    if (nextState === 'background') {
      console.log(
        '[ForegroundService] App moved to background — mesh stays alive',
      );
    } else if (nextState === 'active') {
      console.log('[ForegroundService] App returned to foreground');
    }
  }

  isActive() {
    return this._isActive;
  }
}

module.exports = MeshForegroundService;
