// src/domain/ports/LocationPort.js
// Port Interface: Defines GPS/location contract

class LocationPort {
  /** Get current live GPS coordinates. Returns Location entity or null. */
  async getCurrentLocation() {
    throw new Error('LocationPort.getCurrentLocation() not implemented');
  }

  /** Get last cached GPS coordinates. Returns Location entity or null. */
  async getCachedLocation() {
    throw new Error('LocationPort.getCachedLocation() not implemented');
  }

  /** Start periodic GPS caching (every intervalMs milliseconds). */
  async startCaching(intervalMs = 300000) {
    throw new Error('LocationPort.startCaching() not implemented');
  }

  /** Stop periodic GPS caching. */
  async stopCaching() {
    throw new Error('LocationPort.stopCaching() not implemented');
  }

  /**
   * Get the best available location: live GPS first, then cached, then null.
   * This is the primary method use cases should call.
   */
  async getBestLocation() {
    const live = await this.getCurrentLocation();
    if (live) return live;
    return await this.getCachedLocation();
  }
}

module.exports = LocationPort;
