/**
 * POAP Delivery Service
 * Tracks POAP deliveries to Twitter users
 */

import prisma from '@/lib/prisma';

export interface DeliveryRecord {
  id: string;
  twitterUserId: string;
  tweetId: string;
  mintLink: string;
  qrHash: string;
  deliveredAt: Date;
  claimed: boolean;
  claimedAt: Date | null;
  projectId: string;
}

export interface DeliveryStats {
  totalDelivered: number;
  totalClaimed: number;
  totalUnclaimed: number;
  claimRate: number;
}

/**
 * Record a POAP delivery to a user
 * @param {string} twitterId - Twitter ID (from API)
 * @param {string} username - Twitter username
 * @param {string} tweetId - Tweet ID
 * @param {string} mintLink - POAP mint link
 * @param {string} qrHash - QR code hash
 * @param {string} projectId - Project ID
 * @returns {Promise<DeliveryRecord>} Delivery record
 */
export async function recordDelivery(
  twitterId: string,
  username: string,
  tweetId: string,
  mintLink: string,
  qrHash: string,
  projectId: string
): Promise<DeliveryRecord> {
  try {
    // Ensure Twitter user exists and get their internal ID
    const twitterUser = await prisma.twitterUser.upsert({
      where: { twitterId },
      create: {
        twitterId,
        username,
      },
      update: {
        username,
      },
    });

    // Create delivery record using the internal user ID
    const delivery = await prisma.delivery.create({
      data: {
        twitterUserId: twitterUser.id, // Use the internal cuid, not the Twitter ID
        tweetId,
        mintLink,
        qrHash,
        projectId,
      },
    });

    console.log(`Delivery recorded: ${delivery.id} for user ${username}`);

    return delivery;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to record delivery: ${error.message}`);
    }
    throw new Error('Failed to record delivery: Unknown error');
  }
}

/**
 * Check if a tweet already has a delivery
 * @param {string} tweetId - Tweet ID
 * @param {string} projectId - Project ID (optional)
 * @returns {Promise<boolean>} True if delivery exists
 */
export async function hasDelivery(tweetId: string, projectId?: string): Promise<boolean> {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: projectId ? { tweetId, projectId } : { tweetId },
    });

    return !!delivery;
  } catch (error) {
    console.error(`Error checking delivery for tweet ${tweetId}:`, error);
    return false;
  }
}

/**
 * Check if a user already has a delivery for the current event
 * @param {string} twitterUserId - Twitter user ID (the internal ID from TwitterUser table)
 * @returns {Promise<boolean>} True if user has already claimed
 */
export async function userHasDelivery(twitterUserId: string): Promise<boolean> {
  try {
    // Find TwitterUser by their Twitter ID
    const twitterUser = await prisma.twitterUser.findUnique({
      where: { twitterId: twitterUserId },
    });

    if (!twitterUser) {
      return false;
    }

    // Check if this user has any deliveries
    const delivery = await prisma.delivery.findFirst({
      where: { twitterUserId: twitterUser.id },
    });

    return !!delivery;
  } catch (error) {
    console.error(`Error checking user delivery for ${twitterUserId}:`, error);
    return false;
  }
}

/**
 * Get delivery by tweet ID
 * @param {string} tweetId - Tweet ID
 * @param {string} projectId - Project ID (optional)
 * @returns {Promise<DeliveryRecord | null>} Delivery record or null
 */
export async function getDeliveryByTweet(
  tweetId: string,
  projectId?: string
): Promise<DeliveryRecord | null> {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: projectId ? { tweetId, projectId } : { tweetId },
    });

    return delivery;
  } catch (error) {
    console.error(`Error getting delivery for tweet ${tweetId}:`, error);
    return null;
  }
}

/**
 * Get all deliveries for a Twitter user
 * @param {string} twitterId - Twitter ID (from API)
 * @returns {Promise<DeliveryRecord[]>} Array of deliveries
 */
export async function getUserDeliveries(
  twitterId: string
): Promise<DeliveryRecord[]> {
  try {
    // Find the Twitter user first
    const twitterUser = await prisma.twitterUser.findUnique({
      where: { twitterId },
    });

    if (!twitterUser) {
      console.log(`No user found with twitterId ${twitterId}`);
      return [];
    }

    const deliveries = await prisma.delivery.findMany({
      where: { twitterUserId: twitterUser.id },
      orderBy: { deliveredAt: 'desc' },
    });

    console.log(`Found ${deliveries.length} deliveries for user ${twitterId}`);

    return deliveries;
  } catch (error) {
    console.error(`Error getting deliveries for user ${twitterId}:`, error);
    return [];
  }
}

/**
 * Mark a delivery as claimed
 * @param {string} tweetId - Tweet ID
 * @param {string} projectId - Project ID (optional - will search all projects if not provided)
 * @param {string} claimedBy - Ethereum address or email
 * @returns {Promise<void>}
 */
export async function markDeliveryClaimed(
  tweetId: string,
  projectId?: string,
  claimedBy?: string
): Promise<void> {
  try {
    // Find the delivery first
    const delivery = await prisma.delivery.findFirst({
      where: projectId ? { tweetId, projectId } : { tweetId },
    });

    if (!delivery) {
      throw new Error(`Delivery not found for tweet ${tweetId}`);
    }

    // Update delivery using the ID
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        claimed: true,
        claimedAt: new Date(),
      },
    });

    // Also update the QRCode
    await prisma.qRCode.updateMany({
      where: { qrHash: delivery.qrHash, projectId: delivery.projectId },
      data: {
        claimed: true,
        claimedBy,
        claimedAt: new Date(),
      },
    });

    console.log(`Delivery for tweet ${tweetId} marked as claimed`);
  } catch (error) {
    console.error(`Failed to mark delivery as claimed:`, error);
    throw error;
  }
}

/**
 * Get delivery statistics
 * @returns {Promise<DeliveryStats>} Statistics
 */
export async function getDeliveryStats(): Promise<DeliveryStats> {
  try {
    const [totalDelivered, totalClaimed] = await Promise.all([
      prisma.delivery.count(),
      prisma.delivery.count({
        where: { claimed: true },
      }),
    ]);

    const totalUnclaimed = totalDelivered - totalClaimed;
    const claimRate = totalDelivered > 0 ? (totalClaimed / totalDelivered) * 100 : 0;

    return {
      totalDelivered,
      totalClaimed,
      totalUnclaimed,
      claimRate: Math.round(claimRate * 100) / 100, // Round to 2 decimals
    };
  } catch (error) {
    console.error('Error getting delivery stats:', error);
    return {
      totalDelivered: 0,
      totalClaimed: 0,
      totalUnclaimed: 0,
      claimRate: 0,
    };
  }
}

/**
 * Get recent deliveries
 * @param {number} limit - Maximum number to return
 * @returns {Promise<Array>} Recent deliveries with user info
 */
export async function getRecentDeliveries(limit: number = 10): Promise<
  Array<{
    id: string;
    tweetId: string;
    mintLink: string;
    deliveredAt: Date;
    claimed: boolean;
    claimedAt: Date | null;
    twitterUser: {
      username: string;
      twitterId: string;
    };
  }>
> {
  try {
    const deliveries = await prisma.delivery.findMany({
      take: limit,
      orderBy: { deliveredAt: 'desc' },
      include: {
        twitterUser: {
          select: {
            username: true,
            twitterId: true,
          },
        },
      },
    });

    console.log(`Retrieved ${deliveries.length} recent deliveries`);

    return deliveries;
  } catch (error) {
    console.error('Error getting recent deliveries:', error);
    return [];
  }
}
