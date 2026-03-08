// __tests__/domain/GeoCoordinate.test.js
// Unit Tests for GeoCoordinate value object

const GeoCoordinate = require('../../src/domain/valueobjects/GeoCoordinate');

describe('GeoCoordinate', () => {
  describe('validation', () => {
    it('should accept valid coordinates', () => {
      const coord = new GeoCoordinate(28.6139, 77.209);
      expect(coord.latitude).toBe(28.6139);
      expect(coord.longitude).toBe(77.209);
    });

    it('should reject invalid latitude', () => {
      expect(() => new GeoCoordinate(91, 0)).toThrow('Invalid latitude');
      expect(() => new GeoCoordinate(-91, 0)).toThrow('Invalid latitude');
    });

    it('should reject invalid longitude', () => {
      expect(() => new GeoCoordinate(0, 181)).toThrow('Invalid longitude');
      expect(() => new GeoCoordinate(0, -181)).toThrow('Invalid longitude');
    });
  });

  describe('distanceTo()', () => {
    it('should calculate approximately correct distance', () => {
      const delhi = new GeoCoordinate(28.6139, 77.209);
      const mumbai = new GeoCoordinate(19.076, 72.8777);
      const distance = delhi.distanceTo(mumbai);
      // Delhi to Mumbai is ~1,150 km
      expect(distance).toBeGreaterThan(1100000);
      expect(distance).toBeLessThan(1200000);
    });

    it('should return 0 for same coordinates', () => {
      const a = new GeoCoordinate(28.6139, 77.209);
      const b = new GeoCoordinate(28.6139, 77.209);
      expect(a.distanceTo(b)).toBeCloseTo(0, 0);
    });
  });

  describe('equals()', () => {
    it('should detect equal coordinates', () => {
      const a = new GeoCoordinate(28.6139, 77.209);
      const b = new GeoCoordinate(28.6139, 77.209);
      expect(a.equals(b)).toBe(true);
    });

    it('should detect unequal coordinates', () => {
      const a = new GeoCoordinate(28.6139, 77.209);
      const b = new GeoCoordinate(19.076, 72.8777);
      expect(a.equals(b)).toBe(false);
    });
  });
});
