// __tests__/adapters/CryptoAdapter.test.js
// Unit tests for encryption adapter
const CryptoAdapter = require('../../src/adapters/encryption/CryptoAdapter');

describe('CryptoAdapter', () => {
  let crypto;

  beforeEach(() => {
    crypto = new CryptoAdapter('test-secret-key-p2prescue');
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a payload', () => {
      const payload = {
        message: 'Trapped under rubble, 3 survivors',
        injuredCount: 1,
        waterAvailable: false,
      };

      const encrypted = crypto.encrypt(payload);
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toContain('Trapped');

      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted).toEqual(payload);
    });

    it('should fail to decrypt with wrong key', () => {
      const payload = { message: 'Secret SOS' };
      const encrypted = crypto.encrypt(payload);

      const wrongCrypto = new CryptoAdapter('wrong-key');
      const result = wrongCrypto.decrypt(encrypted);
      expect(result).toBeNull();
    });

    it('should handle empty payloads', () => {
      const encrypted = crypto.encrypt({});
      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted).toEqual({});
    });
  });

  describe('hash', () => {
    it('should produce consistent hashes', () => {
      const hash1 = crypto.hash('test-data');
      const hash2 = crypto.hash('test-data');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = crypto.hash('data-1');
      const hash2 = crypto.hash('data-2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce a 64-char hex string (SHA-256)', () => {
      const hash = crypto.hash('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });
});
