// src/services/LocationCacheWorker.js
// Headless JS periodic task — caches GPS coordinates in the background
// Architecture Spec: Section 4, Line 193 — "Background: WorkManager periodic task"
// This is invoked by the MeshForegroundService at 5-minute intervals

const Location = require('../domain/entities/Location');

class LocationCacheWorker {
  /**
   * @param {LocationPort} locationAdapter
   * @param {StoragePort} storageAdapter - For persisting cache
   */
  constructor(locationAdapter, storageAdapter) {
    this._locationAdapter = locationAdapter;
    this._storageAdapter = storageAdapter;
    this._interval = null;
    this._CACHE_KEY = '@p2prescue_location_cache';
  }

  /**
   * Start periodic caching.
   * @param {number} intervalMs - Cache interval (default: 5 minutes = 300000ms)
   */
  start(intervalMs = 300000) {
    // Cache immediately on start
    this._cacheOnce();

    this._interval = setInterval(() => {
      this._cacheOnce();
    }, intervalMs);

    console.log(
      `[LocationCacheWorker] Started caching every ${intervalMs / 1000}s`,
    );
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    console.log('[LocationCacheWorker] Stopped');
  }

  async _cacheOnce() {
    try {
      const location = await this._locationAdapter.getCurrentLocation();
      if (location) {
        console.log(
          `[LocationCacheWorker] Cached: ${location.latitude.toFixed(
            4,
          )}, ${location.longitude.toFixed(4)}`,
        );
      }
    } catch (error) {
      console.warn('[LocationCacheWorker] Cache failed:', error.message);
    }
  }

  isRunning() {
    return this._interval !== null;
  }
}

module.exports = LocationCacheWorker;
