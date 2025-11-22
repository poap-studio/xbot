/**
 * Twitter API Client
 * Manages Twitter API v2 authentication and client instances
 */

import { TwitterApi } from 'twitter-api-v2';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

// Read-only client for searching tweets (uses Bearer token)
let bearerClient: TwitterApi | null = null;

/**
 * Get read-only Twitter client for searching
 * Uses Bearer token for read-only operations
 * @returns {TwitterApi} Read-only Twitter client
 * @throws {Error} If TWITTER_BEARER_TOKEN is not configured
 */
export function getBearerClient(): TwitterApi {
  if (!process.env.TWITTER_BEARER_TOKEN) {
    throw new Error(
      'TWITTER_BEARER_TOKEN environment variable is not set. ' +
      'This is required for searching tweets.'
    );
  }

  if (!bearerClient) {
    bearerClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
  }

  return bearerClient;
}

/**
 * Get bot client for posting tweets
 * Uses OAuth 1.0a credentials from connected bot account
 * @returns {Promise<TwitterApi>} Bot Twitter client
 * @throws {Error} If bot account is not connected or credentials are invalid
 */
export async function getBotClient(): Promise<TwitterApi> {
  try {
    // Get current config
    const config = await prisma.config.findFirst();

    if (!config?.botAccountId) {
      throw new Error(
        'No bot account connected. Please connect a bot account in the admin panel.'
      );
    }

    // Get bot account
    const botAccount = await prisma.botAccount.findUnique({
      where: { id: config.botAccountId },
    });

    if (!botAccount) {
      throw new Error(
        'Bot account not found. The configured bot account may have been deleted.'
      );
    }

    if (!botAccount.isConnected) {
      throw new Error(
        'Bot account is disconnected. Please reconnect it in the admin panel.'
      );
    }

    // Decrypt credentials
    const accessToken = decrypt(botAccount.accessToken);
    const accessSecret = decrypt(botAccount.accessSecret);

    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      throw new Error(
        'TWITTER_API_KEY and TWITTER_API_SECRET environment variables are required'
      );
    }

    // Create authenticated client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken,
      accessSecret,
    });

    // Update last used timestamp
    await prisma.botAccount.update({
      where: { id: botAccount.id },
      data: { lastUsedAt: new Date() },
    });

    return client;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get bot client: ${error.message}`);
    }
    throw new Error('Failed to get bot client: Unknown error');
  }
}

/**
 * Verify bot client credentials are valid
 * @returns {Promise<boolean>} True if credentials are valid
 * @throws {Error} If verification fails
 */
export async function verifyBotCredentials(): Promise<boolean> {
  try {
    const client = await getBotClient();

    // Verify credentials by getting the authenticated user
    const user = await client.v2.me();

    console.log(`Bot credentials verified for @${user.data.username}`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Bot credentials verification failed: ${error.message}`);
    }
    throw new Error('Bot credentials verification failed: Unknown error');
  }
}

/**
 * Get information about the connected bot account
 * @returns {Promise<object>} Bot account information
 * @throws {Error} If unable to get bot info
 */
export async function getBotInfo(): Promise<{
  id: string;
  username: string;
  name: string;
}> {
  try {
    const client = await getBotClient();
    const user = await client.v2.me({
      'user.fields': ['name', 'username', 'id'],
    });

    return {
      id: user.data.id,
      username: user.data.username,
      name: user.data.name,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get bot info: ${error.message}`);
    }
    throw new Error('Failed to get bot info: Unknown error');
  }
}

/**
 * Check if a bot account is currently connected
 * @returns {Promise<boolean>} True if bot is connected
 */
export async function isBotConnected(): Promise<boolean> {
  try {
    const config = await prisma.config.findFirst();

    if (!config?.botAccountId) {
      return false;
    }

    const botAccount = await prisma.botAccount.findUnique({
      where: { id: config.botAccountId },
    });

    return botAccount?.isConnected || false;
  } catch (error) {
    console.error('Error checking bot connection:', error);
    return false;
  }
}
