// src/services/LocationCacheWorker.js
// Headless JS periodic task — caches GPS coordinates in the background
// Architecture Spec: Section 4, Line 193 — "Background: WorkManager periodic task"
// This is invoked by the MeshForegroundService at 5-minute intervals

const Location = require('../domain/entities/Location');
const BackgroundJob = require('react-native-background-actions').default;
const DeviceInfo = require('react-native-device-info');

const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

class LocationCacheWorker {
  /**
   * @param {LocationPort} locationAdapter
   * @param {StoragePort} storageAdapter - For persisting cache
   */
  constructor(locationAdapter, storageAdapter) {
    this._locationAdapter = locationAdapter;
    this._storageAdapter = storageAdapter;
    this._CACHE_KEY = '@p2prescue_location_cache';
    this._isRunning = false;
  }

  /**
   * Start periodic caching using native WorkManager hooks.
   * @param {number} intervalMs - Cache interval (default: 5 minutes = 300000ms)
   */
  async start(intervalMs = 300000) {
    if (this._isRunning) return;

    const taskRandom = async taskDataArguments => {
      let currentDelay = taskDataArguments.delay;
      await new Promise(async resolve => {
        for (let i = 0; BackgroundJob.isRunning(); i++) {
          await this._cacheOnce();

          try {
            const batteryLevel = await DeviceInfo.getBatteryLevel();
            if (batteryLevel < 0.2) {
              currentDelay = taskDataArguments.delay * 2; // Throttle rate when battery < 20%
              console.log(
                `[Battery] Critical <20%. Adaptive Beacon Rate engaged. Delay: ${currentDelay}ms`,
              );
            } else {
              currentDelay = taskDataArguments.delay;
            }
          } catch (e) {
            console.warn('[BatteryCheck] Error', e.message);
          }

          await sleep(currentDelay);
        }
      });
    };

    const options = {
      taskName: 'LocationCache',
      taskTitle: 'P2P Rescue Service',
      taskDesc: 'Monitoring location and mesh network updates...',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#ff0000',
      linkingURI: 'p2prescue://',
      parameters: {
        delay: intervalMs,
      },
    };

    try {
      await BackgroundJob.start(taskRandom, options);
      this._isRunning = true;
      console.log(
        `[LocationCacheWorker] Started headless background caching every ${
          intervalMs / 1000
        }s`,
      );
    } catch (e) {
      console.error('[LocationCacheWorker] Error starting background job:', e);
    }
  }

  async stop() {
    if (this._isRunning) {
      await BackgroundJob.stop();
      this._isRunning = false;
      console.log('[LocationCacheWorker] Stopped');
    }
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

        // Architecture check: GEO["Geofence Alert"]
        if (this._lastLocation) {
          const dist = this._haversineDistance(this._lastLocation, location);
          if (dist > 5.0) {
            console.warn(
              `GEO["Geofence Alert"]: User drifted ${dist.toFixed(
                1,
              )}km from last known base.`,
            );
          }
        }
        this._lastLocation = location;
      }
    } catch (error) {
      console.warn('[LocationCacheWorker] Cache failed:', error.message);
    }
  }

  _haversineDistance(loc1, loc2) {
    const toRad = x => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(loc2.latitude - loc1.latitude);
    const dLon = toRad(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(loc1.latitude)) *
        Math.cos(toRad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  isRunning() {
    return this._isRunning;
  }
}

module.exports = LocationCacheWorker;
