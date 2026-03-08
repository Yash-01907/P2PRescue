// src/domain/valueobjects/GeoCoordinate.js
// Value Object: Immutable geographic coordinate

class GeoCoordinate {
  constructor(latitude, longitude) {
    if (latitude < -90 || latitude > 90) {
      throw new Error(`Invalid latitude: ${latitude}`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error(`Invalid longitude: ${longitude}`);
    }
    this.latitude = latitude;
    this.longitude = longitude;
  }

  /**
   * Haversine distance in meters to another coordinate.
   */
  distanceTo(other) {
    const R = 6371e3; // Earth radius in meters
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(other.latitude - this.latitude);
    const dLon = toRad(other.longitude - this.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.latitude)) *
        Math.cos(toRad(other.latitude)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  equals(other) {
    return (
      other instanceof GeoCoordinate &&
      this.latitude === other.latitude &&
      this.longitude === other.longitude
    );
  }

  toString() {
    return `(${this.latitude}, ${this.longitude})`;
  }
}

module.exports = GeoCoordinate;
