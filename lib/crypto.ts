/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM mode, this is the nonce length
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * @throws {Error} If ENCRYPTION_SECRET is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error(
      'ENCRYPTION_SECRET environment variable is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  // Validate hex string
  if (!/^[0-9a-f]{64}$/i.test(secret)) {
    throw new Error(
      'ENCRYPTION_SECRET must be a 64-character hex string (32 bytes). ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  return Buffer.from(secret, 'hex');
}

/**
 * Encrypt a string using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
 * @throws {Error} If encryption fails
 */
export function encrypt(text: string): string {
  try {
    if (!text) {
      throw new Error('Cannot encrypt empty string');
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
    throw new Error('Encryption failed with unknown error');
  }
}

/**
 * Decrypt a string encrypted with encrypt()
 * @param encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plain text
 * @throws {Error} If decryption fails or data is tampered
 */
export function decrypt(encryptedData: string): string {
  try {
    if (!encryptedData) {
      throw new Error('Cannot decrypt empty string');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted data format. Expected format: iv:authTag:ciphertext'
      );
    }

    const [ivHex, authTagHex, encrypted] = parts;

    // Validate hex strings
    if (!/^[0-9a-f]+$/i.test(ivHex) ||
        !/^[0-9a-f]+$/i.test(authTagHex) ||
        !/^[0-9a-f]+$/i.test(encrypted)) {
      throw new Error('Invalid encrypted data: not properly hex encoded');
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (error instanceof Error) {
      // Don't expose internal error details for security reasons
      if (error.message.includes('auth')) {
        throw new Error('Decryption failed: data has been tampered with or corrupted');
      }
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error('Decryption failed with unknown error');
  }
}

/**
 * Validate that encryption/decryption is working correctly
 * Used in health checks and tests
 * @returns true if encryption is working, throws otherwise
 */
export function validateEncryption(): boolean {
  try {
    const testData = 'encryption-test-' + Date.now();
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testData) {
      throw new Error('Encryption validation failed: decrypted data does not match');
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Encryption validation failed: ${error.message}`);
    }
    throw new Error('Encryption validation failed');
  }
}
