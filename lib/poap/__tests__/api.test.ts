/**
 * Tests for POAP API service
 * @jest-environment node
 */

import {
  getMintLinks,
  getQRCodeInfo,
  claimPOAP,
  importMintLinks,
  reserveMintLink,
  markMintLinkClaimed,
  getMintLinkStats,
  getAvailableMintLinksCount,
} from '../api';
import prisma from '@/lib/prisma';

// Mock the auth module
jest.mock('../auth', () => ({
  getValidToken: jest.fn().mockResolvedValue('mock_valid_token'),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('POAP API Service', () => {
  let testProjectId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Clean up database
    await prisma.qRCode.deleteMany({});
    await prisma.project.deleteMany({});

    // Create a test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        poapEventId: '12345',
        poapEditCode: 'secret_code',
        twitterHashtag: '#TEST',
        isActive: true,
      },
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getMintLinks', () => {
    it('should fetch mint links from POAP API', async () => {
      const mockMintLinks = [
        { qr_hash: 'abc123', url: 'https://poap.xyz/claim/abc123', claimed: false },
        { qr_hash: 'def456', url: 'https://poap.xyz/claim/def456', claimed: false },
        { qr_hash: 'ghi789', url: 'https://poap.xyz/claim/ghi789', claimed: true },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMintLinks,
      });

      const result = await getMintLinks('12345', 'secret_code');

      expect(result).toEqual(mockMintLinks);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.poap.tech/event/12345/qr-codes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock_valid_token',
          }),
          body: JSON.stringify({ secret_code: 'secret_code' }),
        })
      );
    });

    it('should throw error if API request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          statusCode: 403,
          message: 'Invalid secret code',
        }),
      });

      await expect(getMintLinks('12345', 'wrong_code')).rejects.toThrow(
        'POAP API error'
      );
    });
  });

  describe('getQRCodeInfo', () => {
    it('should fetch QR code information', async () => {
      const mockQRInfo = {
        qr_hash: 'abc123',
        claimed: false,
        secret: 'secret_abc123',
        event: {
          id: 12345,
          name: 'Test Event',
          description: 'A test POAP event',
          image_url: 'https://example.com/image.png',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQRInfo,
      });

      const result = await getQRCodeInfo('abc123');

      expect(result).toEqual(mockQRInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.poap.tech/actions/claim-qr?qr_hash=abc123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock_valid_token',
          }),
        })
      );
    });
  });

  describe('claimPOAP', () => {
    it('should claim POAP with Ethereum address', async () => {
      const mockClaimResponse = {
        id: 1,
        qr_hash: 'abc123',
        event_id: 12345,
        beneficiary: '0x1234567890123456789012345678901234567890',
        claimed: true,
        claimed_date: '2024-01-01T00:00:00Z',
        created_date: '2024-01-01T00:00:00Z',
        signer: '0xSigner',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClaimResponse,
      });

      const result = await claimPOAP(
        'abc123',
        'secret_abc123',
        '0x1234567890123456789012345678901234567890',
        false
      );

      expect(result).toEqual(mockClaimResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.poap.tech/actions/claim-qr',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            qr_hash: 'abc123',
            secret: 'secret_abc123',
            address: '0x1234567890123456789012345678901234567890',
          }),
        })
      );
    });

    it('should claim POAP with email', async () => {
      const mockClaimResponse = {
        id: 1,
        qr_hash: 'abc123',
        event_id: 12345,
        beneficiary: 'user@example.com',
        claimed: true,
        claimed_date: '2024-01-01T00:00:00Z',
        created_date: '2024-01-01T00:00:00Z',
        signer: '0xSigner',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClaimResponse,
      });

      const result = await claimPOAP(
        'abc123',
        'secret_abc123',
        'user@example.com',
        true
      );

      expect(result).toEqual(mockClaimResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.poap.tech/actions/claim-qr',
        expect.objectContaining({
          body: JSON.stringify({
            qr_hash: 'abc123',
            secret: 'secret_abc123',
            email: 'user@example.com',
          }),
        })
      );
    });

    it('should throw error if claim fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          statusCode: 400,
          message: 'QR already claimed',
        }),
      });

      await expect(
        claimPOAP('abc123', 'secret_abc123', '0xAddress', false)
      ).rejects.toThrow('Failed to claim POAP');
    });
  });

  describe('importMintLinks', () => {
    it('should import mint links into database', async () => {
      const mockMintLinks = [
        {
          qr_hash: 'abc123',
          url: 'https://poap.xyz/claim/abc123',
          claimed: false,
          secret: 'secret_abc123',
        },
        {
          qr_hash: 'def456',
          url: 'https://poap.xyz/claim/def456',
          claimed: false,
          secret: 'secret_def456',
        },
        {
          qr_hash: 'ghi789',
          url: 'https://poap.xyz/claim/ghi789',
          claimed: true,
          secret: 'secret_ghi789',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMintLinks,
      });

      const imported = await importMintLinks('12345', 'secret_code', testProjectId);

      expect(imported).toBe(3);

      // Check database
      const stored = await prisma.qRCode.findMany();
      expect(stored).toHaveLength(3);
      expect(stored[0].qrHash).toBe('abc123');
      expect(stored[0].mintLink).toBe('https://poap.xyz/claim/abc123');
      expect(stored[0].secret).toBe('secret_abc123');
      expect(stored[0].claimed).toBe(false);
    });

    it('should update existing mint links', async () => {
      // Create existing mint link
      await prisma.qRCode.create({
        data: {
          qrHash: 'abc123',
          mintLink: 'https://poap.xyz/claim/abc123',
          claimed: false,
          projectId: testProjectId,
        },
      });

      const mockMintLinks = [
        {
          qr_hash: 'abc123',
          url: 'https://poap.xyz/claim/abc123',
          claimed: true, // Now claimed
          secret: 'secret_abc123',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMintLinks,
      });

      await importMintLinks('12345', 'secret_code', testProjectId);

      // Check it was updated
      const updated = await prisma.qRCode.findUnique({
        where: { qrHash_projectId: { qrHash: 'abc123', projectId: testProjectId } },
      });
      expect(updated!.claimed).toBe(true);
      expect(updated!.secret).toBe('secret_abc123');
    });

    it('should throw error if no mint links found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await expect(importMintLinks('12345', 'secret_code')).rejects.toThrow(
        'No mint links found'
      );
    });
  });

  describe('reserveMintLink', () => {
    beforeEach(async () => {
      // Create some available mint links
      await prisma.qRCode.createMany({
        data: [
          {
            qrHash: 'abc123',
            mintLink: 'https://poap.xyz/claim/abc123',
            claimed: false,
            projectId: testProjectId,
          },
          {
            qrHash: 'def456',
            mintLink: 'https://poap.xyz/claim/def456',
            claimed: false,
            projectId: testProjectId,
          },
          {
            qrHash: 'ghi789',
            mintLink: 'https://poap.xyz/claim/ghi789',
            claimed: true, // Already claimed
            projectId: testProjectId,
          },
        ],
      });
    });

    it('should reserve an available mint link', async () => {
      const twitterId = 'user123';
      const mintLink = await reserveMintLink(twitterId);

      expect(mintLink).toBeTruthy();
      expect(mintLink).toContain('https://poap.xyz/claim/');

      // Check it was reserved
      const reserved = await prisma.qRCode.findFirst({
        where: { reservedFor: twitterId },
      });
      expect(reserved).not.toBeNull();
      expect(reserved!.reservedAt).toBeTruthy();
    });

    it('should reserve oldest available mint link (FIFO)', async () => {
      // Create with specific timestamps
      await prisma.qRCode.deleteMany({});

      const older = await prisma.qRCode.create({
        data: {
          qrHash: 'old123',
          mintLink: 'https://poap.xyz/claim/old123',
          claimed: false,
          createdAt: new Date('2024-01-01'),
          projectId: testProjectId,
        },
      });

      await prisma.qRCode.create({
        data: {
          qrHash: 'new456',
          mintLink: 'https://poap.xyz/claim/new456',
          claimed: false,
          createdAt: new Date('2024-01-02'),
          projectId: testProjectId,
        },
      });

      const mintLink = await reserveMintLink('user123');

      expect(mintLink).toBe(older.mintLink);
    });

    it('should return null if no available mint links', async () => {
      // Mark all as claimed or reserved
      await prisma.qRCode.updateMany({
        where: {},
        data: { claimed: true },
      });

      const mintLink = await reserveMintLink('user123');

      expect(mintLink).toBeNull();
    });

    it('should not reserve already reserved mint links', async () => {
      // Reserve one
      await reserveMintLink('user1');

      // Reserve another
      const mintLink2 = await reserveMintLink('user2');

      // Should get a different link
      const reserved1 = await prisma.qRCode.findFirst({
        where: { reservedFor: 'user1' },
      });
      const reserved2 = await prisma.qRCode.findFirst({
        where: { reservedFor: 'user2' },
      });

      expect(reserved1!.id).not.toBe(reserved2!.id);
    });
  });

  describe('markMintLinkClaimed', () => {
    beforeEach(async () => {
      await prisma.qRCode.create({
        data: {
          qrHash: 'abc123',
          mintLink: 'https://poap.xyz/claim/abc123',
          claimed: false,
          reservedFor: 'user123',
          projectId: testProjectId,
        },
      });
    });

    it('should mark mint link as claimed', async () => {
      await markMintLinkClaimed('abc123', '0xAddress');

      const claimed = await prisma.qRCode.findUnique({
        where: { qrHash_projectId: { qrHash: 'abc123', projectId: testProjectId } },
      });

      expect(claimed!.claimed).toBe(true);
      expect(claimed!.claimedBy).toBe('0xAddress');
      expect(claimed!.claimedAt).toBeTruthy();
    });
  });

  describe('getMintLinkStats', () => {
    beforeEach(async () => {
      await prisma.qRCode.createMany({
        data: [
          {
            qrHash: 'available1',
            mintLink: 'https://poap.xyz/claim/available1',
            claimed: false,
            projectId: testProjectId,
          },
          {
            qrHash: 'available2',
            mintLink: 'https://poap.xyz/claim/available2',
            claimed: false,
            projectId: testProjectId,
          },
          {
            qrHash: 'reserved1',
            mintLink: 'https://poap.xyz/claim/reserved1',
            claimed: false,
            reservedFor: 'user1',
            projectId: testProjectId,
          },
          {
            qrHash: 'claimed1',
            mintLink: 'https://poap.xyz/claim/claimed1',
            claimed: true,
            claimedBy: '0xAddress',
            projectId: testProjectId,
          },
          {
            qrHash: 'claimed2',
            mintLink: 'https://poap.xyz/claim/claimed2',
            claimed: true,
            claimedBy: 'user@example.com',
            projectId: testProjectId,
          },
        ],
      });
    });

    it('should return correct statistics', async () => {
      const stats = await getMintLinkStats();

      expect(stats).toEqual({
        total: 5,
        available: 2,
        reserved: 1,
        claimed: 2,
      });
    });

    it('should return zero stats if no mint links', async () => {
      await prisma.qRCode.deleteMany({});

      const stats = await getMintLinkStats();

      expect(stats).toEqual({
        total: 0,
        available: 0,
        reserved: 0,
        claimed: 0,
      });
    });
  });

  describe('getAvailableMintLinksCount', () => {
    it('should return count of available mint links', async () => {
      await prisma.qRCode.createMany({
        data: [
          { qrHash: 'a1', mintLink: 'https://poap.xyz/claim/a1', claimed: false, projectId: testProjectId },
          { qrHash: 'a2', mintLink: 'https://poap.xyz/claim/a2', claimed: false, projectId: testProjectId },
          { qrHash: 'a3', mintLink: 'https://poap.xyz/claim/a3', claimed: true, projectId: testProjectId },
          {
            qrHash: 'a4',
            mintLink: 'https://poap.xyz/claim/a4',
            claimed: false,
            reservedFor: 'user1',
            projectId: testProjectId,
          },
        ],
      });

      const count = await getAvailableMintLinksCount();

      expect(count).toBe(2);
    });
  });
});
