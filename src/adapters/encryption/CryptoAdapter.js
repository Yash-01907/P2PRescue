// src/adapters/encryption/CryptoAdapter.js
// Adapter: AES-256 encryption/decryption for SOS payloads
const CryptoJS = require('crypto-js');

class CryptoAdapter {
  constructor(secretKey = 'P2PRESCUE_DEFAULT_KEY_CHANGE_ME') {
    this._secretKey = secretKey;
  }

  /**
   * Encrypt a payload object with AES-256.
   * @param {object} payload - The data to encrypt
   * @returns {string} Encrypted ciphertext
   */
  encrypt(payload) {
    const plaintext = JSON.stringify(payload);
    return CryptoJS.AES.encrypt(plaintext, this._secretKey).toString();
  }

  /**
   * Decrypt an AES-256 ciphertext back to a payload object.
   * @param {string} ciphertext
   * @returns {object|null} Decrypted payload or null if decryption fails
   */
  decrypt(ciphertext) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this._secretKey);
      const plaintext = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(plaintext);
    } catch {
      console.warn('[CryptoAdapter] Decryption failed');
      return null;
    }
  }

  /**
   * Generate a SHA-256 checksum for integrity verification.
   * @param {string} data
   * @returns {string} Hex hash
   */
  hash(data) {
    return CryptoJS.SHA256(data).toString();
  }
}

module.exports = CryptoAdapter;
