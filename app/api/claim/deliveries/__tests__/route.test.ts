/**
 * Tests for Claim Deliveries API Route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { auth } from '@/lib/auth';
import { getUserDeliveries } from '@/lib/bot/delivery';
import { getQRCodeInfo } from '@/lib/poap/api';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/bot/delivery');
jest.mock('@/lib/poap/api');

describe('GET /api/claim/deliveries', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for getQRCodeInfo
    (getQRCodeInfo as jest.Mock).mockResolvedValue({
      claimed: false,
      beneficiary: null,
    });
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/claim/deliveries');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 401 if session has no user ID', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { name: 'Test User' },
    });

    const request = new NextRequest('http://localhost:3000/api/claim/deliveries');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return user deliveries when authenticated', async () => {
    const mockDeliveries = [
      {
        id: 'delivery_1',
        twitterUserId: 'user_123',
        tweetId: 'tweet_123',
        mintLink: 'https://poap.xyz/claim/abc123',
        qrHash: 'abc123',
        deliveredAt: new Date('2024-01-01T10:00:00Z'),
        claimed: false,
        claimedAt: null,
        projectId: 'project_1',
      },
      {
        id: 'delivery_2',
        twitterUserId: 'user_123',
        tweetId: 'tweet_456',
        mintLink: 'https://poap.xyz/claim/def456',
        qrHash: 'def456',
        deliveredAt: new Date('2024-01-02T10:00:00Z'),
        claimed: true,
        claimedAt: new Date('2024-01-03T10:00:00Z'),
        projectId: 'project_1',
      },
    ];

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'twitter_123', username: 'testuser' },
    });

    (getUserDeliveries as jest.Mock).mockResolvedValue(mockDeliveries);

    // Mock getQRCodeInfo to return status based on qrHash
    (getQRCodeInfo as jest.Mock).mockImplementation((qrHash: string) => {
      if (qrHash === 'abc123') {
        return Promise.resolve({ claimed: false, beneficiary: null });
      }
      if (qrHash === 'def456') {
        return Promise.resolve({ claimed: true, beneficiary: '0x123' });
      }
      return Promise.resolve({ claimed: false, beneficiary: null });
    });

    const request = new NextRequest('http://localhost:3000/api/claim/deliveries');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deliveries).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.claimed).toBe(1);
    expect(data.unclaimed).toBe(1);

    // Check first delivery
    expect(data.deliveries[0]).toMatchObject({
      id: 'delivery_1',
      tweetId: 'tweet_123',
      mintLink: 'https://poap.xyz/claim/abc123',
      qrHash: 'abc123',
      deliveredAt: '2024-01-01T10:00:00.000Z',
      claimed: false,
      claimedAt: null,
    });

    // Check second delivery
    expect(data.deliveries[1]).toMatchObject({
      id: 'delivery_2',
      tweetId: 'tweet_456',
      mintLink: 'https://poap.xyz/claim/def456',
      qrHash: 'def456',
      deliveredAt: '2024-01-02T10:00:00.000Z',
      claimed: true,
      claimedAt: '2024-01-03T10:00:00.000Z',
    });

    // Verify getUserDeliveries was called with correct Twitter ID
    expect(getUserDeliveries).toHaveBeenCalledWith('twitter_123');
  });

  it('should return empty array when user has no deliveries', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'twitter_123', username: 'testuser' },
    });

    (getUserDeliveries as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/claim/deliveries');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deliveries).toHaveLength(0);
    expect(data.total).toBe(0);
    expect(data.claimed).toBe(0);
    expect(data.unclaimed).toBe(0);
  });

  it('should handle errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'twitter_123', username: 'testuser' },
    });

    (getUserDeliveries as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new NextRequest('http://localhost:3000/api/claim/deliveries');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch deliveries');
    expect(data.details).toBe('Database connection failed');
  });

  it('should format dates as ISO strings', async () => {
    const testDate = new Date('2024-06-15T14:30:00.123Z');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'twitter_123', username: 'testuser' },
    });

    (getUserDeliveries as jest.Mock).mockResolvedValue([
      {
        id: 'delivery_1',
        twitterUserId: 'user_123',
        tweetId: 'tweet_123',
        mintLink: 'https://poap.xyz/claim/abc123',
        qrHash: 'abc123',
        deliveredAt: testDate,
        claimed: false,
        claimedAt: null,
        projectId: 'project_1',
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/claim/deliveries');
    const response = await GET(request);
    const data = await response.json();

    expect(data.deliveries[0].deliveredAt).toBe('2024-06-15T14:30:00.123Z');
  });

  it('should correctly count claimed vs unclaimed deliveries', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'twitter_123', username: 'testuser' },
    });

    (getUserDeliveries as jest.Mock).mockResolvedValue([
      {
        id: '1',
        twitterUserId: 'user_123',
        tweetId: 'tweet_1',
        mintLink: 'https://poap.xyz/claim/1',
        qrHash: '1',
        deliveredAt: new Date(),
        claimed: false,
        claimedAt: null,
        projectId: 'project_1',
      },
      {
        id: '2',
        twitterUserId: 'user_123',
        tweetId: 'tweet_2',
        mintLink: 'https://poap.xyz/claim/2',
        qrHash: '2',
        deliveredAt: new Date(),
        claimed: false,
        claimedAt: null,
        projectId: 'project_1',
      },
      {
        id: '3',
        twitterUserId: 'user_123',
        tweetId: 'tweet_3',
        mintLink: 'https://poap.xyz/claim/3',
        qrHash: '3',
        deliveredAt: new Date(),
        claimed: true,
        claimedAt: new Date(),
        projectId: 'project_1',
      },
    ]);

    // Mock getQRCodeInfo to return claimed status based on qrHash
    (getQRCodeInfo as jest.Mock).mockImplementation((qrHash: string) => {
      return Promise.resolve({
        claimed: qrHash === '3',
        beneficiary: qrHash === '3' ? '0x123' : null,
      });
    });

    const request = new NextRequest('http://localhost:3000/api/claim/deliveries');
    const response = await GET(request);
    const data = await response.json();

    expect(data.total).toBe(3);
    expect(data.claimed).toBe(1);
    expect(data.unclaimed).toBe(2);
  });
});
