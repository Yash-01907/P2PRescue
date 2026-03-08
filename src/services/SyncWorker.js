// src/services/SyncWorker.js
// Background worker: watches for connectivity changes and triggers dashboard sync

class SyncWorker {
  /**
   * @param {ConnectivityPort} connectivityAdapter
   * @param {SyncToDashboardUseCase} syncUseCase
   */
  constructor(connectivityAdapter, syncUseCase) {
    this._connectivityAdapter = connectivityAdapter;
    this._syncUseCase = syncUseCase;
    this._isRunning = false;
  }

  /**
   * Start watching for connectivity changes.
   * When cell signal is restored, trigger sync immediately.
   */
  start() {
    this._isRunning = true;
    this._connectivityAdapter.onConnectivityChanged(async isConnected => {
      if (isConnected && this._isRunning) {
        console.log('[SyncWorker] Cell signal restored — syncing to dashboard');
        const result = await this._syncUseCase.execute();
        console.log(
          `[SyncWorker] Sync result: ${result.synced} synced, ${result.failed} failed`,
        );
      }
    });
    console.log('[SyncWorker] Started');
  }

  stop() {
    this._isRunning = false;
    this._connectivityAdapter.removeConnectivityListener();
    console.log('[SyncWorker] Stopped');
  }

  /** Manual sync trigger (e.g., when user taps "Sync Now") */
  async syncNow() {
    return await this._syncUseCase.execute();
  }

  isRunning() {
    return this._isRunning;
  }
}

module.exports = SyncWorker;
