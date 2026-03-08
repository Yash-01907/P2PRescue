// src/adapters/location/GPSLocationAdapter.js
// Adapter: Implements LocationPort using react-native-geolocation-service
const LocationPort = require('../../domain/ports/LocationPort');
const Location = require('../../domain/entities/Location');

class GPSLocationAdapter extends LocationPort {
  constructor(storage) {
    super();
    this._cachedLocation = null;
    this._cachingInterval = null;
    this._storage = storage; // AsyncStorage instance for persistence
    this._CACHE_KEY = '@p2prescue_location_cache';
  }

  async getCurrentLocation() {
    return new Promise(resolve => {
      try {
        const Geolocation = require('react-native-geolocation-service').default;
        Geolocation.getCurrentPosition(
          position => {
            const location = new Location({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              fixTimestamp: new Date(position.timestamp).toISOString(),
              source: 'GPS_LIVE',
            });

            // Also update cache with fresh location
            this._updateCache(location);
            resolve(location);
          },
          error => {
            console.warn('[GPSAdapter] Live GPS error:', error.message);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
            showLocationDialog: true,
          },
        );
      } catch {
        console.warn('[GPSAdapter] Geolocation service not available');
        resolve(null);
      }
    });
  }

  async getCachedLocation() {
    // Try in-memory cache first
    if (this._cachedLocation) {
      return new Location({
        ...this._cachedLocation,
        source: 'GPS_CACHED',
      });
    }

    // Then try persisted cache
    try {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      const cached = await AsyncStorage.getItem(this._CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return new Location({ ...parsed, source: 'GPS_CACHED' });
      }
    } catch {
      console.warn('[GPSAdapter] Failed to read location cache');
    }

    return null;
  }

  async startCaching(intervalMs = 300000) {
    // Cache location every 5 minutes by default
    this._cachingInterval = setInterval(async () => {
      const location = await this.getCurrentLocation();
      if (location) {
        this._updateCache(location);
      }
    }, intervalMs);

    // Cache immediately on start
    const location = await this.getCurrentLocation();
    if (location) {
      this._updateCache(location);
    }
  }

  async stopCaching() {
    if (this._cachingInterval) {
      clearInterval(this._cachingInterval);
      this._cachingInterval = null;
    }
  }

  async _updateCache(location) {
    this._cachedLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      fixTimestamp: location.fixTimestamp,
    };

    // Persist to AsyncStorage
    try {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(
        this._CACHE_KEY,
        JSON.stringify(this._cachedLocation),
      );
    } catch {
      console.warn('[GPSAdapter] Failed to persist location cache');
    }
  }
}

module.exports = GPSLocationAdapter;
