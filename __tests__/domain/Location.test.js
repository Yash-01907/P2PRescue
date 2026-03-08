// __tests__/domain/Location.test.js
// Unit Tests for Location domain entity

const Location = require('../../src/domain/entities/Location');

describe('Location', () => {
  describe('source detection', () => {
    it('should detect live GPS', () => {
      const loc = new Location({ source: 'GPS_LIVE' });
      expect(loc.isLive()).toBe(true);
      expect(loc.isCached()).toBe(false);
      expect(loc.hasLocation()).toBe(true);
    });

    it('should detect cached GPS', () => {
      const loc = new Location({ source: 'GPS_CACHED' });
      expect(loc.isLive()).toBe(false);
      expect(loc.isCached()).toBe(true);
      expect(loc.hasLocation()).toBe(true);
    });

    it('should detect no location', () => {
      const loc = new Location({ source: 'NONE' });
      expect(loc.isLive()).toBe(false);
      expect(loc.isCached()).toBe(false);
      expect(loc.hasLocation()).toBe(false);
    });
  });

  describe('staleness', () => {
    it('should calculate staleness in seconds', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const loc = new Location({ fixTimestamp: fiveMinAgo });
      const staleness = loc.getStalenessSeconds();
      expect(staleness).toBeGreaterThanOrEqual(299);
      expect(staleness).toBeLessThanOrEqual(301);
    });
  });

  describe('confidence radius', () => {
    it('should return GPS accuracy for fresh fix (< 5 min)', () => {
      const loc = new Location({
        accuracy: 10,
        fixTimestamp: new Date().toISOString(),
      });
      expect(loc.getConfidenceRadius()).toBe(10);
    });

    it('should return 500m for fix between 5 min and 1 hour old', () => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const loc = new Location({ accuracy: 10, fixTimestamp: thirtyMinAgo });
      expect(loc.getConfidenceRadius()).toBe(500);
    });

    it('should return 5000m for fix older than 1 hour', () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      const loc = new Location({ accuracy: 10, fixTimestamp: twoHoursAgo });
      expect(loc.getConfidenceRadius()).toBe(5000);
    });
  });

  describe('serialization', () => {
    it('should include staleness in JSON output', () => {
      const loc = new Location({
        latitude: 28.6139,
        longitude: 77.209,
        accuracy: 10,
        source: 'GPS_LIVE',
      });
      const json = loc.toJSON();
      expect(json.stalenessSeconds).toBeDefined();
      expect(json.latitude).toBe(28.6139);
    });
  });
});
