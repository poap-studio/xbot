/**
 * Tests for POAP OAuth2 authentication
 * @jest-environment node
 */

import { getValidToken, renewToken, validateCredentials } from '../auth';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

// Mock fetch globally
global.fetch = jest.fn();

// Mock encryption module
jest.mock('@/lib/crypto', () => ({
  decrypt: jest.fn((value: string) => {
    // Return the "decrypted" value (in tests, we'll store plain text)
    if (value === 'encrypted_client_id') return 'test_client_id';
    if (value === 'encrypted_client_secret') return 'test_client_secret';
    return value;
  }),
  encrypt: jest.fn((value: string) => `encrypted_${value}`),
}));

describe('POAP OAuth2 Authentication', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clean up database
    await prisma.poapAuth.deleteMany({});
    await prisma.config.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('validateCredentials', () => {
    it('should throw error if credentials not configured', async () => {
      await expect(validateCredentials()).rejects.toThrow(
        'POAP API credentials not configured'
      );
    });

    it('should validate successfully if credentials exist', async () => {
      await prisma.config.create({
        data: {
          id: 'default',
          poapEventId: '123',
          poapSecretCode: 'secret',
          poapClientId: 'encrypted_client_id',
          poapClientSecret: 'encrypted_client_secret',
        },
      });

      await expect(validateCredentials()).resolves.toBe(true);
    });
  });

  describe('renewToken', () => {
    beforeEach(async () => {
      // Set up config with credentials
      await prisma.config.create({
        data: {
          id: 'default',
          poapEventId: '123',
          poapSecretCode: 'secret',
          poapClientId: 'encrypted_client_id',
          poapClientSecret: 'encrypted_client_secret',
        },
      });
    });

    it('should request and store new token', async () => {
      const mockToken = 'new_access_token_12345';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 86400, // 24 hours
        }),
      });

      const token = await renewToken();

      expect(token).toBe(mockToken);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://auth.accounts.poap.xyz/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            audience: 'https://api.poap.tech',
            grant_type: 'client_credentials',
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
          }),
        })
      );

      // Check token was stored in database
      const storedAuth = await prisma.poapAuth.findFirst();
      expect(storedAuth).not.toBeNull();
      expect(storedAuth!.accessToken).toBe(mockToken);
    });

    it('should throw error if token request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid credentials',
      });

      await expect(renewToken()).rejects.toThrow('POAP OAuth2 token request failed');
    });

    it('should throw error if response missing access_token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token_type: 'Bearer',
          expires_in: 86400,
          // missing access_token
        }),
      });

      await expect(renewToken()).rejects.toThrow('missing access_token');
    });

    it('should replace old token with new one', async () => {
      // Store an old token
      await prisma.poapAuth.create({
        data: {
          accessToken: 'old_token',
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      const mockToken = 'new_access_token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });

      await renewToken();

      // Should only have one token (the new one)
      const tokens = await prisma.poapAuth.findMany();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].accessToken).toBe(mockToken);
    });
  });

  describe('getValidToken', () => {
    beforeEach(async () => {
      await prisma.config.create({
        data: {
          id: 'default',
          poapEventId: '123',
          poapSecretCode: 'secret',
          poapClientId: 'encrypted_client_id',
          poapClientSecret: 'encrypted_client_secret',
        },
      });
    });

    it('should return cached token if still valid', async () => {
      const validToken = 'valid_cached_token';
      // Create a token that expires in 10 hours (well within buffer)
      await prisma.poapAuth.create({
        data: {
          accessToken: validToken,
          expiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
        },
      });

      const token = await getValidToken();

      expect(token).toBe(validToken);
      // Should not make any fetch calls
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should renew token if expired', async () => {
      // Create an expired token
      await prisma.poapAuth.create({
        data: {
          accessToken: 'expired_token',
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      const newToken = 'renewed_token_12345';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: newToken,
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });

      const token = await getValidToken();

      expect(token).toBe(newToken);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should renew token if within renewal buffer', async () => {
      // Create a token that expires in 30 minutes (within 1-hour buffer)
      await prisma.poapAuth.create({
        data: {
          accessToken: 'soon_to_expire_token',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const newToken = 'pre_renewed_token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: newToken,
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });

      const token = await getValidToken();

      expect(token).toBe(newToken);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should renew token if none exists', async () => {
      const newToken = 'first_token_12345';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: newToken,
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });

      const token = await getValidToken();

      expect(token).toBe(newToken);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Token expiry calculation', () => {
    beforeEach(async () => {
      await prisma.config.create({
        data: {
          id: 'default',
          poapEventId: '123',
          poapSecretCode: 'secret',
          poapClientId: 'encrypted_client_id',
          poapClientSecret: 'encrypted_client_secret',
        },
      });
    });

    it('should store token with correct expiry time', async () => {
      const expiresIn = 86400; // 24 hours in seconds
      const beforeRequest = Date.now();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          token_type: 'Bearer',
          expires_in: expiresIn,
        }),
      });

      await renewToken();

      const afterRequest = Date.now();
      const storedAuth = await prisma.poapAuth.findFirst();

      expect(storedAuth).not.toBeNull();

      const expectedExpiryMin = new Date(beforeRequest + expiresIn * 1000);
      const expectedExpiryMax = new Date(afterRequest + expiresIn * 1000);

      expect(storedAuth!.expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedExpiryMin.getTime()
      );
      expect(storedAuth!.expiresAt.getTime()).toBeLessThanOrEqual(
        expectedExpiryMax.getTime()
      );
    });
  });
});
