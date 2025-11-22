/**
 * Tests for Bot orchestration service
 * @jest-environment node
 */

import {
  processSingleTweet,
  runBotProcess,
  validateBotConfiguration,
} from '../service';
import type { ProcessedTweet } from '@/lib/twitter/search';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

// Mock twitter module
jest.mock('@/lib/twitter/search', () => ({
  searchNewEligibleTweets: jest.fn(),
  saveTweets: jest.fn(),
}));

jest.mock('@/lib/twitter/reply', () => ({
  replyWithClaimUrl: jest.fn(),
  hasBeenRepliedTo: jest.fn(),
}));

jest.mock('@/lib/poap/api', () => ({
  reserveMintLink: jest.fn(),
  getMintLinkStats: jest.fn(),
}));

// Import mocked functions
import { searchNewEligibleTweets, saveTweets } from '@/lib/twitter/search';
import { replyWithClaimUrl, hasBeenRepliedTo } from '@/lib/twitter/reply';
import { reserveMintLink, getMintLinkStats } from '@/lib/poap/api';

describe('Bot Orchestration Service', () => {
  // Global counter for unique mint link generation
  let globalMintLinkCounter = 0;

  const mockTweet: ProcessedTweet = {
    id: 'tweet_123',
    text: 'Test tweet with #POAP and ELIGIBLE code',
    authorId: 'user_123',
    authorUsername: 'testuser',
    hasImage: true,
    hasCode: true,
    isEligible: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Clean up database
    await prisma.delivery.deleteMany({});
    await prisma.twitterUser.deleteMany({});
    await prisma.qRCode.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.config.deleteMany({});
    await prisma.botAccount.deleteMany({});

    // Setup default mocks
    (searchNewEligibleTweets as jest.Mock).mockResolvedValue([]);
    (saveTweets as jest.Mock).mockResolvedValue(0);
    (hasBeenRepliedTo as jest.Mock).mockResolvedValue(false);

    // Mock reserveMintLink to return unique URLs using global counter and timestamp
    (reserveMintLink as jest.Mock).mockImplementation(() => {
      globalMintLinkCounter++;
      const timestamp = Date.now();
      const uniqueId = `${timestamp}_${globalMintLinkCounter}_${Math.random().toString(36).substring(7)}`;
      return Promise.resolve(`https://poap.xyz/claim/${uniqueId}`);
    });

    (replyWithClaimUrl as jest.Mock).mockResolvedValue('reply_123');
  }, 30000); // 30 second timeout for cleanup

  afterAll(async () => {
    await prisma.$disconnect();
  }, 120000); // 120 second timeout

  describe('processSingleTweet', () => {
    it('should successfully process a tweet', async () => {
      const result = await processSingleTweet(mockTweet);

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe('tweet_123');
      expect(result.username).toBe('testuser');
      expect(result.mintLink).toMatch(/^https:\/\/poap\.xyz\/claim\//); // Unique mock with timestamp
      expect(result.replyId).toBe('reply_123');

      // Verify delivery was recorded
      const delivery = await prisma.delivery.findUnique({
        where: { tweetId: 'tweet_123' },
      });
      expect(delivery).toBeDefined();
    });

    it('should skip if tweet already has delivery', async () => {
      // Create existing delivery with proper references
      const user = await prisma.twitterUser.create({
        data: {
          twitterId: 'user_123',
          username: 'testuser',
        },
      });
      await prisma.delivery.create({
        data: {
          twitterUserId: user.id, // Use the internal ID, not the Twitter ID
          tweetId: 'tweet_123',
          mintLink: 'https://poap.xyz/claim/existing',
          qrHash: 'existing',
        },
      });

      const result = await processSingleTweet(mockTweet);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already delivered');

      // Verify no new reply was sent
      expect(replyWithClaimUrl).not.toHaveBeenCalled();
    });

    it('should skip if tweet already replied to', async () => {
      (hasBeenRepliedTo as jest.Mock).mockResolvedValue(true);

      const result = await processSingleTweet(mockTweet);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already replied');
    });

    it('should fail if no mint links available', async () => {
      (reserveMintLink as jest.Mock).mockResolvedValue(null);

      const result = await processSingleTweet(mockTweet);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No mint links available');

      // Verify no reply was sent
      expect(replyWithClaimUrl).not.toHaveBeenCalled();
    });

    it('should handle reply errors', async () => {
      (replyWithClaimUrl as jest.Mock).mockRejectedValue(
        new Error('Twitter API error')
      );

      const result = await processSingleTweet(mockTweet);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Twitter API error');
    });

    it('should extract qrHash from mint link correctly', async () => {
      await processSingleTweet(mockTweet);

      const delivery = await prisma.delivery.findUnique({
        where: { tweetId: 'tweet_123' },
      });

      // Expect the new unique format: timestamp_counter_random
      expect(delivery!.qrHash).toMatch(/^\d+_\d+_[a-z0-9]+$/);
    });

    it('should handle app.poap.xyz links', async () => {
      (reserveMintLink as jest.Mock).mockResolvedValue(
        'https://app.poap.xyz/claim/xyz789'
      );

      await processSingleTweet(mockTweet);

      const delivery = await prisma.delivery.findUnique({
        where: { tweetId: 'tweet_123' },
      });

      expect(delivery!.qrHash).toBe('xyz789');
    });

    it('should fail if mint link format is invalid', async () => {
      (reserveMintLink as jest.Mock).mockResolvedValue('https://invalid.com');

      const result = await processSingleTweet(mockTweet);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid mint link format');
    });
  });

  describe('runBotProcess', () => {
    it(
      'should process eligible tweets successfully',
      async () => {
        const tweets: ProcessedTweet[] = [
          mockTweet,
          {
            ...mockTweet,
            id: 'tweet_456',
            authorId: 'user_456',
            authorUsername: 'user2',
          },
        ];

        (searchNewEligibleTweets as jest.Mock).mockResolvedValue(tweets);
        (saveTweets as jest.Mock).mockResolvedValue(2);

        const result = await runBotProcess(10);

        expect(result.tweetsFound).toBe(2);
        expect(result.tweetsEligible).toBe(2);
        expect(result.deliveriesSuccessful).toBe(2);
        expect(result.deliveriesFailed).toBe(0);
        expect(result.errors).toHaveLength(0);

        // Verify tweets were saved
        expect(saveTweets).toHaveBeenCalledWith(tweets);
      },
      20000
    ); // 20 second timeout

    it('should return early if no tweets found', async () => {
      (searchNewEligibleTweets as jest.Mock).mockResolvedValue([]);

      const result = await runBotProcess();

      expect(result.tweetsFound).toBe(0);
      expect(result.deliveriesSuccessful).toBe(0);

      // Verify saveTweets was not called
      expect(saveTweets).not.toHaveBeenCalled();
    });

    it(
      'should respect maxTweets limit',
      async () => {
        const tweets: ProcessedTweet[] = Array.from({ length: 5 }, (_, i) => ({
          ...mockTweet,
          id: `tweet_${i}`,
          authorId: `user_${i}`,
          authorUsername: `user${i}`,
        }));

        (searchNewEligibleTweets as jest.Mock).mockResolvedValue(tweets);
        (saveTweets as jest.Mock).mockResolvedValue(5);

        const result = await runBotProcess(3); // Limit to 3

        expect(result.tweetsFound).toBe(5);
        expect(result.tweetsEligible).toBe(5);
        expect(result.deliveriesSuccessful).toBe(3); // Only 3 processed
      },
      20000
    ); // 20 second timeout for slower database operations

    it(
      'should track both successes and failures',
      async () => {
        const tweets: ProcessedTweet[] = [
          mockTweet,
          {
            ...mockTweet,
            id: 'tweet_2',
            authorId: 'user_2',
            authorUsername: 'user2',
          },
        ];

        (searchNewEligibleTweets as jest.Mock).mockResolvedValue(tweets);
        (saveTweets as jest.Mock).mockResolvedValue(2);

        // Reset the mock to control calls precisely
        (reserveMintLink as jest.Mock).mockReset();

        // First tweet succeeds, second fails (no mint links)
        (reserveMintLink as jest.Mock)
          .mockResolvedValueOnce('https://poap.xyz/claim/success1')
          .mockResolvedValueOnce(null);

        const result = await runBotProcess(10);

        expect(result.deliveriesSuccessful).toBe(1);
        expect(result.deliveriesFailed).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].error).toBe('No mint links available');
      },
      20000
    ); // 20 second timeout

    it('should handle search errors', async () => {
      (searchNewEligibleTweets as jest.Mock).mockRejectedValue(
        new Error('Search failed')
      );

      const result = await runBotProcess();

      expect(result.tweetsFound).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].tweetId).toBe('PROCESS');
      expect(result.errors[0].error).toContain('Search failed');
    });

    it('should filter only eligible tweets', async () => {
      const tweets: ProcessedTweet[] = [
        mockTweet,
        {
          ...mockTweet,
          id: 'tweet_456',
          isEligible: false, // Not eligible
        },
      ];

      (searchNewEligibleTweets as jest.Mock).mockResolvedValue(tweets);
      (saveTweets as jest.Mock).mockResolvedValue(2);

      const result = await runBotProcess(10);

      expect(result.tweetsFound).toBe(2);
      expect(result.tweetsEligible).toBe(1);
      expect(result.deliveriesSuccessful).toBe(1); // Only 1 eligible
    });

    it(
      'should wait between processing tweets (rate limiting)',
      async () => {
        jest.useFakeTimers();

        const tweets: ProcessedTweet[] = [
          mockTweet,
          {
            ...mockTweet,
            id: 'tweet_456',
            authorId: 'user_456',
            authorUsername: 'user2',
          },
        ];

        (searchNewEligibleTweets as jest.Mock).mockResolvedValue(tweets);
        (saveTweets as jest.Mock).mockResolvedValue(2);

        const processPromise = runBotProcess(10);

        // Fast-forward timers
        await jest.runAllTimersAsync();

        const result = await processPromise;

        expect(result.deliveriesSuccessful).toBe(2);

        jest.useRealTimers();
      },
      120000
    ); // 120 second timeout
  });

  describe('validateBotConfiguration', () => {
    beforeEach(async () => {
      // Set required environment variables
      process.env.TWITTER_BEARER_TOKEN = 'test_bearer';
      process.env.TWITTER_API_KEY = 'test_key';
      process.env.TWITTER_API_SECRET = 'test_secret';

      (getMintLinkStats as jest.Mock).mockResolvedValue({
        total: 10,
        available: 5,
        reserved: 3,
        claimed: 2,
      });
    });

    it(
      'should validate successfully with complete config',
      async () => {
        // Create bot account
        const botAccount = await prisma.botAccount.create({
          data: {
            twitterId: '12345',
            username: 'testbot',
            accessToken: encrypt('token'),
            accessSecret: encrypt('secret'),
            isConnected: true,
          },
        });

        // Create config
        await prisma.config.create({
          data: {
            id: 'test-config-validate',
            poapEventId: '123',
            poapSecretCode: 'secret',
            botAccountId: botAccount.id,
            poapClientId: encrypt('client_id'),
            poapClientSecret: encrypt('client_secret'),
          },
        });

        await expect(validateBotConfiguration()).resolves.not.toThrow();
      },
      120000
    );

    it('should throw if TWITTER_BEARER_TOKEN not set', async () => {
      delete process.env.TWITTER_BEARER_TOKEN;

      await expect(validateBotConfiguration()).rejects.toThrow(
        'TWITTER_BEARER_TOKEN not set'
      );
    });

    it('should throw if TWITTER_API_KEY not set', async () => {
      delete process.env.TWITTER_API_KEY;

      await expect(validateBotConfiguration()).rejects.toThrow(
        'TWITTER_API_KEY not set'
      );
    });

    it('should throw if TWITTER_API_SECRET not set', async () => {
      delete process.env.TWITTER_API_SECRET;

      await expect(validateBotConfiguration()).rejects.toThrow(
        'TWITTER_API_SECRET not set'
      );
    });

    it('should throw if bot not connected', async () => {
      await expect(validateBotConfiguration()).rejects.toThrow(
        'Bot account is not connected'
      );
    });

    it('should throw if config not found', async () => {
      // Create bot but no config
      await prisma.botAccount.create({
        data: {
          twitterId: '12345',
          username: 'testbot',
          accessToken: encrypt('token'),
          accessSecret: encrypt('secret'),
          isConnected: true,
        },
      });

      // Create config without linking (no botAccountId)
      await prisma.config.create({
        data: {
          id: 'test-config-nolink',
          poapEventId: '123',
          poapSecretCode: 'secret',
        },
      });

      // This should fail with "Bot account is not connected" because config has no botAccountId
      await expect(validateBotConfiguration()).rejects.toThrow(
        'Bot account is not connected'
      );
    });

    it(
      'should throw if POAP credentials not set',
      async () => {
        const botAccount = await prisma.botAccount.create({
          data: {
            twitterId: '12345-nocreds',
            username: 'testbot',
            accessToken: encrypt('token'),
            accessSecret: encrypt('secret'),
            isConnected: true,
          },
        });

        await prisma.config.create({
          data: {
            id: 'test-config-nocreds',
            poapEventId: '123',
            poapSecretCode: 'secret',
            botAccountId: botAccount.id,
            // No POAP credentials
          },
        });

        await expect(validateBotConfiguration()).rejects.toThrow(
          'POAP API credentials not configured'
        );
      },
      120000
    );

    it(
      'should throw if no mint links available',
      async () => {
        const botAccount = await prisma.botAccount.create({
          data: {
            twitterId: '12345-nomints',
            username: 'testbot',
            accessToken: encrypt('token'),
            accessSecret: encrypt('secret'),
            isConnected: true,
          },
        });

        await prisma.config.create({
          data: {
            id: 'test-config-nomints',
            poapEventId: '123',
            poapSecretCode: 'secret',
            botAccountId: botAccount.id,
            poapClientId: encrypt('client_id'),
            poapClientSecret: encrypt('client_secret'),
          },
        });

        (getMintLinkStats as jest.Mock).mockResolvedValue({
          total: 10,
          available: 0, // No available links
          reserved: 5,
          claimed: 5,
        });

        await expect(validateBotConfiguration()).rejects.toThrow(
          'No mint links available'
        );
      },
      120000
    );

    it('should collect multiple validation errors', async () => {
      delete process.env.TWITTER_BEARER_TOKEN;
      delete process.env.TWITTER_API_KEY;

      try {
        await validateBotConfiguration();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('TWITTER_BEARER_TOKEN not set');
        expect(message).toContain('TWITTER_API_KEY not set');
      }
    });
  });
});
