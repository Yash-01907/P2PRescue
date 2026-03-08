// src/domain/entities/Location.js
// Domain Entity: GPS location with staleness tracking

class Location {
  constructor({
    latitude = 0,
    longitude = 0,
    accuracy = 0,
    fixTimestamp = new Date().toISOString(),
    source = 'NONE', // GPS_LIVE | GPS_CACHED | NONE
  } = {}) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.accuracy = accuracy;
    this.fixTimestamp = fixTimestamp;
    this.source = source;
  }

  /**
   * How many seconds since this GPS fix was taken.
   */
  getStalenessSeconds() {
    return Math.floor(
      (Date.now() - new Date(this.fixTimestamp).getTime()) / 1000,
    );
  }

  /**
   * Confidence radius in meters based on staleness.
   * Fresh fix = accuracy only; stale fix = wider radius.
   */
  getConfidenceRadius() {
    const staleness = this.getStalenessSeconds();
    if (staleness < 300) return this.accuracy; // < 5 min: GPS accuracy
    if (staleness < 3600) return 500; // < 1 hour: 500m radius
    return 5000; // > 1 hour: 5km radius
  }

  isLive() {
    return this.source === 'GPS_LIVE';
  }

  isCached() {
    return this.source === 'GPS_CACHED';
  }

  hasLocation() {
    return this.source !== 'NONE';
  }

  toJSON() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      fixTimestamp: this.fixTimestamp,
      stalenessSeconds: this.getStalenessSeconds(),
      source: this.source,
    };
  }

  static fromJSON(json) {
    return new Location(json);
  }
}

module.exports = Location;
