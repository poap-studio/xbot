/**
 * Tests for encryption utilities
 */

import { encrypt, decrypt, validateEncryption } from '../crypto';

// Set up encryption secret for tests
const TEST_ENCRYPTION_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('Crypto utilities', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_SECRET = TEST_ENCRYPTION_SECRET;
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_SECRET;
  });

  describe('encrypt', () => {
    it('should encrypt a string successfully', () => {
      const plaintext = 'sensitive_token_12345';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertexts for the same input', () => {
      const plaintext = 'same_text';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error for empty string', () => {
      expect(() => encrypt('')).toThrow('Cannot encrypt empty string');
    });

    it('should produce encrypted string in correct format', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);

      // Format: iv:authTag:ciphertext (all hex)
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // IV should be 32 hex chars (16 bytes)
      expect(parts[0]).toMatch(/^[0-9a-f]{32}$/i);

      // Auth tag should be 32 hex chars (16 bytes)
      expect(parts[1]).toMatch(/^[0-9a-f]{32}$/i);

      // Ciphertext should be hex
      expect(parts[2]).toMatch(/^[0-9a-f]+$/i);
    });

    it('should encrypt unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decrypt', () => {
    it('should decrypt correctly encrypted data', () => {
      const plaintext = 'sensitive_data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for empty string', () => {
      expect(() => decrypt('')).toThrow('Cannot decrypt empty string');
    });

    it('should throw error for invalid format', () => {
      expect(() => decrypt('invalid')).toThrow('Decryption failed');
      expect(() => decrypt('only:two')).toThrow('Decryption failed');
    });

    it('should throw error for tampered data', () => {
      const plaintext = 'original_data';
      const encrypted = encrypt(plaintext);

      // Tamper with the ciphertext
      const parts = encrypted.split(':');
      parts[2] = parts[2].substring(0, parts[2].length - 2) + 'ff';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow('Decryption failed');
    });

    it('should throw error for tampered auth tag', () => {
      const plaintext = 'original_data';
      const encrypted = encrypt(plaintext);

      // Tamper with auth tag
      const parts = encrypted.split(':');
      parts[1] = parts[1].substring(0, parts[1].length - 2) + 'ff';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow('Decryption failed');
    });

    it('should throw error for invalid hex encoding', () => {
      expect(() => decrypt('zzz:yyy:xxx')).toThrow('not properly hex encoded');
    });

    it('should throw error for wrong IV length', () => {
      const encrypted = 'aa:' + '0'.repeat(32) + ':aabbcc';
      expect(() => decrypt(encrypted)).toThrow('Invalid IV length');
    });
  });

  describe('validateEncryption', () => {
    it('should validate encryption is working', () => {
      expect(validateEncryption()).toBe(true);
    });

    it('should throw error if ENCRYPTION_SECRET is not set', () => {
      const originalSecret = process.env.ENCRYPTION_SECRET;
      delete process.env.ENCRYPTION_SECRET;

      expect(() => validateEncryption()).toThrow('ENCRYPTION_SECRET environment variable is not set');

      process.env.ENCRYPTION_SECRET = originalSecret;
    });

    it('should throw error if ENCRYPTION_SECRET is invalid', () => {
      const originalSecret = process.env.ENCRYPTION_SECRET;
      process.env.ENCRYPTION_SECRET = 'too_short';

      expect(() => validateEncryption()).toThrow('must be a 64-character hex string');

      process.env.ENCRYPTION_SECRET = originalSecret;
    });
  });

  describe('edge cases', () => {
    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
      const encrypted = encrypt(specialChars);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    it('should handle newlines and tabs', () => {
      const plaintext = 'line1\nline2\ttab\r\nwindows';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON strings', () => {
      const json = JSON.stringify({ key: 'value', nested: { data: 123 } });
      const encrypted = encrypt(json);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(json);
      expect(JSON.parse(decrypted)).toEqual({ key: 'value', nested: { data: 123 } });
    });

    it('should be deterministically different for same input', () => {
      const plaintext = 'test';
      const results = new Set();

      // Encrypt same text 100 times
      for (let i = 0; i < 100; i++) {
        results.add(encrypt(plaintext));
      }

      // All should be unique (different IVs)
      expect(results.size).toBe(100);

      // But all should decrypt to same value
      results.forEach((encrypted) => {
        expect(decrypt(encrypted as string)).toBe(plaintext);
      });
    });
  });
});
