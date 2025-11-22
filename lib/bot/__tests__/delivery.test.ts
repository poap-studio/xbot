/**
 * Tests for POAP delivery service
 * @jest-environment node
 */

import {
  recordDelivery,
  hasDelivery,
  getDeliveryByTweet,
  getUserDeliveries,
  markDeliveryClaimed,
  getDeliveryStats,
  getRecentDeliveries,
} from '../delivery';
import prisma from '@/lib/prisma';

describe('POAP Delivery Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clean up in correct order - deliveries first since they reference twitterUser
    try {
      await prisma.delivery.deleteMany({});
    } catch (error) {
      console.error('Error deleting deliveries:', error);
    }
    try {
      await prisma.twitterUser.deleteMany({});
    } catch (error) {
      console.error('Error deleting twitter users:', error);
    }
    try {
      await prisma.qRCode.deleteMany({});
    } catch (error) {
      console.error('Error deleting qr codes:', error);
    }
  }, 15000); // 15 second timeout for cleanup

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('recordDelivery', () => {
    it('should create delivery record and twitter user', async () => {
      const delivery = await recordDelivery(
        'user_123',
        'testuser',
        'tweet_123',
        'https://poap.xyz/claim/abc123',
        'abc123'
      );

      expect(delivery).toBeDefined();
      expect(delivery.twitterUserId).toBeDefined(); // Should be a cuid, not the Twitter ID
      expect(delivery.tweetId).toBe('tweet_123');
      expect(delivery.mintLink).toBe('https://poap.xyz/claim/abc123');
      expect(delivery.qrHash).toBe('abc123');
      expect(delivery.claimed).toBe(false);

      // Verify Twitter user was created
      const twitterUser = await prisma.twitterUser.findUnique({
        where: { twitterId: 'user_123' },
      });
      expect(twitterUser).toBeDefined();
      expect(twitterUser!.username).toBe('testuser');
    });

    it('should update username if user already exists', async () => {
      // Create user first
      await prisma.twitterUser.create({
        data: {
          twitterId: 'user_123',
          username: 'oldusername',
        },
      });

      // Record delivery with new username
      await recordDelivery(
        'user_123',
        'newusername',
        'tweet_123',
        'https://poap.xyz/claim/abc123',
        'abc123'
      );

      // Check username was updated
      const user = await prisma.twitterUser.findUnique({
        where: { twitterId: 'user_123' },
      });

      expect(user!.username).toBe('newusername');
    });

    it('should throw error for duplicate tweet delivery', async () => {
      // First delivery
      await recordDelivery(
        'user_123',
        'testuser',
        'tweet_123',
        'https://poap.xyz/claim/abc123',
        'abc123'
      );

      // Attempt duplicate delivery
      await expect(
        recordDelivery(
          'user_123',
          'testuser',
          'tweet_123',
          'https://poap.xyz/claim/def456',
          'def456'
        )
      ).rejects.toThrow();
    });
  });

  describe('hasDelivery', () => {
    it('should return false if no delivery exists', async () => {
      const result = await hasDelivery('non_existent_tweet');

      expect(result).toBe(false);
    });

    it('should return true if delivery exists', async () => {
      await recordDelivery(
        'user_123',
        'testuser',
        'tweet_123',
        'https://poap.xyz/claim/abc123',
        'abc123'
      );

      const result = await hasDelivery('tweet_123');

      expect(result).toBe(true);
    });
  });

  describe('getDeliveryByTweet', () => {
    it('should return null if delivery not found', async () => {
      const result = await getDeliveryByTweet('non_existent_tweet');

      expect(result).toBeNull();
    });

    it('should return delivery record', async () => {
      await recordDelivery(
        'user_123',
        'testuser',
        'tweet_123',
        'https://poap.xyz/claim/abc123',
        'abc123'
      );

      const result = await getDeliveryByTweet('tweet_123');

      expect(result).toBeDefined();
      expect(result!.tweetId).toBe('tweet_123');
      expect(result!.mintLink).toBe('https://poap.xyz/claim/abc123');
    });
  });

  describe('getUserDeliveries', () => {
    let user123Id: string;
    let user456Id: string;

    beforeEach(async () => {
      // Create users first and store their IDs
      const user123 = await prisma.twitterUser.create({
        data: {
          twitterId: 'twitter_123',
          username: 'testuser',
        },
      });
      user123Id = user123.id;

      const user456 = await prisma.twitterUser.create({
        data: {
          twitterId: 'twitter_456',
          username: 'testuser2',
        },
      });
      user456Id = user456.id;

      // Create multiple deliveries
      await prisma.delivery.createMany({
        data: [
          {
            twitterUserId: user123Id,
            tweetId: 'tweet_1',
            mintLink: 'https://poap.xyz/claim/abc1',
            qrHash: 'abc1',
            deliveredAt: new Date('2024-01-01'),
          },
          {
            twitterUserId: user123Id,
            tweetId: 'tweet_2',
            mintLink: 'https://poap.xyz/claim/abc2',
            qrHash: 'abc2',
            deliveredAt: new Date('2024-01-02'),
          },
          {
            twitterUserId: user456Id,
            tweetId: 'tweet_3',
            mintLink: 'https://poap.xyz/claim/abc3',
            qrHash: 'abc3',
            deliveredAt: new Date('2024-01-03'),
          },
        ],
      });
    });

    it('should return all deliveries for a user', async () => {
      const deliveries = await getUserDeliveries('twitter_123');

      expect(deliveries).toHaveLength(2);
      expect(deliveries[0].tweetId).toBe('tweet_2'); // Most recent first
      expect(deliveries[1].tweetId).toBe('tweet_1');
    });

    it('should return empty array if no deliveries', async () => {
      const deliveries = await getUserDeliveries('twitter_nonexistent');

      expect(deliveries).toHaveLength(0);
    });

    it('should order by deliveredAt desc', async () => {
      const deliveries = await getUserDeliveries('twitter_123');

      expect(deliveries[0].deliveredAt.getTime()).toBeGreaterThan(
        deliveries[1].deliveredAt.getTime()
      );
    });
  });

  describe('markDeliveryClaimed', () => {
    beforeEach(async () => {
      // Create QR code
      await prisma.qRCode.create({
        data: {
          qrHash: 'abc123',
          mintLink: 'https://poap.xyz/claim/abc123',
          claimed: false,
        },
      });

      // Create delivery
      await recordDelivery(
        'user_123',
        'testuser',
        'tweet_123',
        'https://poap.xyz/claim/abc123',
        'abc123'
      );
    });

    it('should mark delivery as claimed', async () => {
      await markDeliveryClaimed('tweet_123', '0x1234567890abcdef');

      const delivery = await prisma.delivery.findUnique({
        where: { tweetId: 'tweet_123' },
      });

      expect(delivery!.claimed).toBe(true);
      expect(delivery!.claimedAt).toBeDefined();
    });

    it('should also update QRCode as claimed', async () => {
      await markDeliveryClaimed('tweet_123', '0x1234567890abcdef');

      const qrCode = await prisma.qRCode.findUnique({
        where: { qrHash: 'abc123' },
      });

      expect(qrCode!.claimed).toBe(true);
      expect(qrCode!.claimedBy).toBe('0x1234567890abcdef');
      expect(qrCode!.claimedAt).toBeDefined();
    });

    it('should work without claimedBy parameter', async () => {
      await markDeliveryClaimed('tweet_123');

      const delivery = await prisma.delivery.findUnique({
        where: { tweetId: 'tweet_123' },
      });

      expect(delivery!.claimed).toBe(true);
    });
  });

  describe('getDeliveryStats', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prisma.twitterUser.create({
        data: {
          twitterId: 'twitter_stats',
          username: 'testuser',
        },
      });
      userId = user.id;

      // Create some deliveries
      await prisma.delivery.createMany({
        data: [
          {
            twitterUserId: userId,
            tweetId: 'tweet_stats_1',
            mintLink: 'https://poap.xyz/claim/abc1',
            qrHash: 'stats_abc1',
            claimed: true,
            claimedAt: new Date(),
          },
          {
            twitterUserId: userId,
            tweetId: 'tweet_stats_2',
            mintLink: 'https://poap.xyz/claim/abc2',
            qrHash: 'stats_abc2',
            claimed: true,
            claimedAt: new Date(),
          },
          {
            twitterUserId: userId,
            tweetId: 'tweet_stats_3',
            mintLink: 'https://poap.xyz/claim/abc3',
            qrHash: 'stats_abc3',
            claimed: false,
          },
        ],
      });
    });

    it('should return correct statistics', async () => {
      const stats = await getDeliveryStats();

      expect(stats.totalDelivered).toBe(3);
      expect(stats.totalClaimed).toBe(2);
      expect(stats.totalUnclaimed).toBe(1);
      expect(stats.claimRate).toBe(66.67); // 2/3 * 100 rounded to 2 decimals
    });

    it('should return zero stats if no deliveries', async () => {
      await prisma.delivery.deleteMany({});

      const stats = await getDeliveryStats();

      expect(stats).toEqual({
        totalDelivered: 0,
        totalClaimed: 0,
        totalUnclaimed: 0,
        claimRate: 0,
      });
    });

    it('should handle 100% claim rate', async () => {
      await prisma.delivery.deleteMany({});

      const user = await prisma.twitterUser.create({
        data: {
          twitterId: 'twitter_100pct',
          username: 'testuser100',
        },
      });

      await prisma.delivery.createMany({
        data: [
          {
            twitterUserId: user.id,
            tweetId: 'tweet_100_1',
            mintLink: 'https://poap.xyz/claim/abc100_1',
            qrHash: 'abc100_1',
            claimed: true,
            claimedAt: new Date(),
          },
          {
            twitterUserId: user.id,
            tweetId: 'tweet_100_2',
            mintLink: 'https://poap.xyz/claim/abc100_2',
            qrHash: 'abc100_2',
            claimed: true,
            claimedAt: new Date(),
          },
        ],
      });

      const stats = await getDeliveryStats();

      expect(stats.claimRate).toBe(100);
    });
  });

  describe('getRecentDeliveries', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prisma.twitterUser.create({
        data: {
          twitterId: 'twitter_recent',
          username: 'testuser',
        },
      });
      userId = user.id;

      // Create deliveries with different timestamps
      for (let i = 1; i <= 15; i++) {
        await prisma.delivery.create({
          data: {
            twitterUserId: userId,
            tweetId: `tweet_recent_${i}`,
            mintLink: `https://poap.xyz/claim/recent${i}`,
            qrHash: `recent${i}`,
            deliveredAt: new Date(Date.now() - i * 1000 * 60), // i minutes ago
          },
        });
      }
    }, 30000); // 30 second timeout for creating 15 deliveries

    it('should return recent deliveries with user info', async () => {
      const deliveries = await getRecentDeliveries(5);

      expect(deliveries).toHaveLength(5);
      expect(deliveries[0].twitterUser.username).toBe('testuser');
      expect(deliveries[0].twitterUser.twitterId).toBe('twitter_recent');
    });

    it('should respect limit parameter', async () => {
      const deliveries = await getRecentDeliveries(3);

      expect(deliveries).toHaveLength(3);
    });

    it('should order by deliveredAt desc', async () => {
      const deliveries = await getRecentDeliveries(5);

      for (let i = 0; i < deliveries.length - 1; i++) {
        expect(deliveries[i].deliveredAt.getTime()).toBeGreaterThan(
          deliveries[i + 1].deliveredAt.getTime()
        );
      }
    });

    it('should default to 10 deliveries', async () => {
      const deliveries = await getRecentDeliveries();

      expect(deliveries).toHaveLength(10);
    });
  });
});
