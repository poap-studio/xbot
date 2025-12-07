/**
 * Tests for Twitter API client
 * @jest-environment node
 */

import { getBearerClient, getBotClient, verifyBotCredentials, isBotConnected } from '../client';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

// Mock twitter-api-v2
jest.mock('twitter-api-v2', () => {
  return {
    TwitterApi: jest.fn().mockImplementation((credentials) => {
      return {
        v2: {
          me: jest.fn().mockResolvedValue({
            data: {
              id: '12345',
              username: 'testbot',
              name: 'Test Bot',
            },
          }),
        },
        credentials,
      };
    }),
  };
});

// Mock crypto module
jest.mock('@/lib/crypto', () => ({
  decrypt: jest.fn((value: string) => {
    if (value === 'encrypted_access_token') return 'decrypted_access_token';
    if (value === 'encrypted_access_secret') return 'decrypted_access_secret';
    return value;
  }),
  encrypt: jest.fn((value: string) => `encrypted_${value}`),
}));

describe('Twitter API Client', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.botAccount.deleteMany({});
    await prisma.config.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getBearerClient', () => {
    it('should return bearer client with token', () => {
      process.env.TWITTER_BEARER_TOKEN = 'test_bearer_token';

      const client = getBearerClient();

      expect(client).toBeDefined();
      expect(client.credentials).toBe('test_bearer_token');
    });

    it('should throw error if TWITTER_BEARER_TOKEN not set', () => {
      delete process.env.TWITTER_BEARER_TOKEN;

      expect(() => getBearerClient()).toThrow('TWITTER_BEARER_TOKEN');
    });

    it('should reuse same client instance', () => {
      process.env.TWITTER_BEARER_TOKEN = 'test_bearer_token';

      const client1 = getBearerClient();
      const client2 = getBearerClient();

      expect(client1).toBe(client2);
    });
  });

  describe('getBotClient', () => {
    beforeEach(async () => {
      process.env.TWITTER_API_KEY = 'test_api_key';
      process.env.TWITTER_API_SECRET = 'test_api_secret';
    });

    it('should throw error if no bot account connected', async () => {
      await expect(getBotClient()).rejects.toThrow('No bot account connected');
    });

    it('should throw error if bot account is disconnected', async () => {
      await prisma.botAccount.create({
        data: {
          twitterId: '12345',
          username: 'testbot',
          accessToken: 'encrypted_access_token',
          accessSecret: 'encrypted_access_secret',
          isConnected: false,
        },
      });

      await expect(getBotClient()).rejects.toThrow('No bot account connected');
    });

    it('should return authenticated client for connected bot', async () => {
      await prisma.botAccount.create({
        data: {
          twitterId: '12345-connected',
          username: 'testbot',
          accessToken: 'encrypted_access_token',
          accessSecret: 'encrypted_access_secret',
          isConnected: true,
        },
      });

      const client = await getBotClient();

      expect(client).toBeDefined();
      expect(client.credentials).toEqual({
        appKey: 'test_api_key',
        appSecret: 'test_api_secret',
        accessToken: 'decrypted_access_token',
        accessSecret: 'decrypted_access_secret',
      });
    });

    it('should update lastUsedAt when getting bot client', async () => {
      const botAccount = await prisma.botAccount.create({
        data: {
          twitterId: '12345-lastused',
          username: 'testbot',
          accessToken: 'encrypted_access_token',
          accessSecret: 'encrypted_access_secret',
          isConnected: true,
          lastUsedAt: new Date('2024-01-01'),
        },
      });

      await getBotClient();

      const updated = await prisma.botAccount.findUnique({
        where: { id: botAccount.id },
      });

      expect(updated!.lastUsedAt!.getTime()).toBeGreaterThan(
        new Date('2024-01-01').getTime()
      );
    });

    it('should throw error if API keys not set', async () => {
      delete process.env.TWITTER_API_KEY;
      delete process.env.TWITTER_API_SECRET;

      await prisma.botAccount.create({
        data: {
          twitterId: '12345-nokeys',
          username: 'testbot',
          accessToken: 'encrypted_access_token',
          accessSecret: 'encrypted_access_secret',
          isConnected: true,
        },
      });

      await expect(getBotClient()).rejects.toThrow('TWITTER_API_KEY');
    });
  });

  describe('verifyBotCredentials', () => {
    beforeEach(async () => {
      process.env.TWITTER_API_KEY = 'test_api_key';
      process.env.TWITTER_API_SECRET = 'test_api_secret';
    });

    it('should verify bot credentials successfully', async () => {
      await prisma.botAccount.create({
        data: {
          twitterId: '12345-verify',
          username: 'testbot',
          accessToken: 'encrypted_access_token',
          accessSecret: 'encrypted_access_secret',
          isConnected: true,
        },
      });

      const result = await verifyBotCredentials();

      expect(result).toBe(true);
    });
  });

  describe('isBotConnected', () => {
    it('should return false if no bot account exists', async () => {
      const result = await isBotConnected();

      expect(result).toBe(false);
    });

    it('should return true if bot is connected', async () => {
      await prisma.botAccount.create({
        data: {
          twitterId: '12345-isconnected',
          username: 'testbot',
          accessToken: 'encrypted_access_token',
          accessSecret: 'encrypted_access_secret',
          isConnected: true,
        },
      });

      const result = await isBotConnected();

      expect(result).toBe(true);
    });

    it('should return false if bot is disconnected', async () => {
      await prisma.botAccount.create({
        data: {
          twitterId: '12345-isdisconnected',
          username: 'testbot',
          accessToken: 'encrypted_access_token',
          accessSecret: 'encrypted_access_secret',
          isConnected: false,
        },
      });

      const result = await isBotConnected();

      expect(result).toBe(false);
    });
  });
});
