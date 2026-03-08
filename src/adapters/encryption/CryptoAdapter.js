// src/adapters/encryption/CryptoAdapter.js
// Adapter: AES-256 encryption/decryption for SOS payloads
const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;
const ec = new EC('p256');

class CryptoAdapter {
  constructor(secretKey = 'P2PRESCUE_DEFAULT_KEY_CHANGE_ME') {
    this._secretKey = secretKey;

    // Generate an ephemeral ECDH keypair for this session
    this.keyPair = ec.genKeyPair();
    this.publicKeyStr = this.keyPair.getPublic('hex');
  }

  /**
   * Get this node's public key (Hex) to broadcast to peers.
   */
  getPublicKey() {
    return this.publicKeyStr;
  }

  /**
   * Derive a symmetric shared secret using another peer's ECDH public key.
   * @param {string} peerPublicKeyHex
   * @returns {string} Shared secret (Hex)
   */
  deriveSharedKey(peerPublicKeyHex) {
    try {
      const peerKey = ec.keyFromPublic(peerPublicKeyHex, 'hex');
      const sharedSecret = this.keyPair.derive(peerKey.getPublic());
      // Hash the shared secret to ensure a 256-bit uniform AES key
      return CryptoJS.SHA256(sharedSecret.toString(16)).toString();
    } catch (e) {
      console.error('[CryptoAdapter] ECDH key derivation error', e);
      return null;
    }
  }

  /**
   * Encrypt a payload object with AES-256.
   * @param {object} payload - The data to encrypt
   * @param {string} [customKey] - Optional ECDH shared key
   * @returns {string} Encrypted ciphertext
   */
  encrypt(payload, customKey = null) {
    const key = customKey || this._secretKey;
    const plaintext = JSON.stringify(payload);
    return CryptoJS.AES.encrypt(plaintext, key).toString();
  }

  /**
   * Decrypt an AES-256 ciphertext back to a payload object.
   * @param {string} ciphertext
   * @param {string} [customKey] - Optional ECDH shared key
   * @returns {object|null} Decrypted payload or null if decryption fails
   */
  decrypt(ciphertext, customKey = null) {
    const key = customKey || this._secretKey;
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, key);
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
