// src/usecases/CacheLocationUseCase.js
// Use Case: Periodically cache GPS coordinates for cold-start fallback

class CacheLocationUseCase {
  /**
   * @param {LocationPort} locationPort
   */
  constructor(locationPort) {
    this.locationPort = locationPort;
  }

  /**
   * Execute a single GPS cache cycle.
   * Called periodically by background worker.
   * @returns {object} { success, location, error }
   */
  async execute() {
    try {
      const location = await this.locationPort.getCurrentLocation();
      if (location) {
        return { success: true, location: location.toJSON(), error: null };
      }
      return { success: false, location: null, error: 'GPS fix unavailable' };
    } catch (error) {
      return { success: false, location: null, error: error.message };
    }
  }
}

module.exports = CacheLocationUseCase;
