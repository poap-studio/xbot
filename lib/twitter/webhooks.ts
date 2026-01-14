/**
 * Twitter Webhooks Management Service
 * Handles webhook registration, deletion, and subscriptions via Twitter API
 */

import crypto from 'crypto';
import { getWebhookUrl } from '@/lib/config/app-url';

/**
 * OAuth 1.0a signature generation for Twitter API
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  return signature;
}

/**
 * Generate OAuth 1.0a Authorization header
 */
function generateOAuthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(32).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(method, url, oauthParams, apiSecret, accessSecret);
  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return authHeader;
}

/**
 * Register a new webhook for a bot account
 * @returns webhook_id on success, null on failure
 */
export async function registerWebhook(): Promise<string | null> {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      console.error('TWITTER_BEARER_TOKEN not found');
      return null;
    }

    const webhookUrl = getWebhookUrl();
    console.log(`Registering webhook with URL: ${webhookUrl}`);

    const response = await fetch('https://api.twitter.com/2/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to register webhook:', error);
      return null;
    }

    const data = await response.json();
    const webhookId = data.data?.id;

    if (!webhookId) {
      console.error('Webhook registered but no ID returned');
      return null;
    }

    console.log(`✅ Webhook registered: ${webhookId}`);
    return webhookId;

  } catch (error) {
    console.error('Error registering webhook:', error);
    return null;
  }
}

/**
 * Delete a webhook by ID
 */
export async function deleteWebhook(webhookId: string): Promise<boolean> {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      console.error('TWITTER_BEARER_TOKEN not found');
      return false;
    }

    const response = await fetch(`https://api.twitter.com/2/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to delete webhook:', error);
      return false;
    }

    console.log(`✅ Webhook deleted: ${webhookId}`);
    return true;

  } catch (error) {
    console.error('Error deleting webhook:', error);
    return false;
  }
}

/**
 * Subscribe a bot account to its webhook
 * Uses the bot's OAuth credentials to subscribe
 */
export async function subscribeWebhook(
  webhookId: string,
  accessToken: string,
  accessSecret: string
): Promise<boolean> {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('TWITTER_API_KEY or TWITTER_API_SECRET not found');
      return false;
    }

    const subscribeUrl = `https://api.twitter.com/2/account_activity/webhooks/${webhookId}/subscriptions/all`;

    const authHeader = generateOAuthHeader(
      'POST',
      subscribeUrl,
      apiKey,
      apiSecret,
      accessToken,
      accessSecret
    );

    const response = await fetch(subscribeUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();

      // Check if subscription already exists (this is actually OK)
      if (error.errors?.[0]?.message?.includes('DuplicateSubscriptionFailed') ||
          error.errors?.[0]?.message?.includes('already exists')) {
        console.log('✅ Webhook subscription already exists (this is fine)');
        return true; // Treat as success since subscription exists
      }

      console.error('Failed to subscribe webhook:', error);
      return false;
    }

    const data = await response.json();

    if (data.data?.subscribed) {
      console.log(`✅ Webhook subscribed for account`);
      return true;
    }

    return false;

  } catch (error) {
    console.error('Error subscribing webhook:', error);
    return false;
  }
}

/**
 * Unsubscribe a bot account from its webhook
 */
export async function unsubscribeWebhook(
  webhookId: string,
  accessToken: string,
  accessSecret: string
): Promise<boolean> {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('TWITTER_API_KEY or TWITTER_API_SECRET not found');
      return false;
    }

    const unsubscribeUrl = `https://api.twitter.com/2/account_activity/webhooks/${webhookId}/subscriptions/all`;

    const authHeader = generateOAuthHeader(
      'DELETE',
      unsubscribeUrl,
      apiKey,
      apiSecret,
      accessToken,
      accessSecret
    );

    const response = await fetch(unsubscribeUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
    });

    // 204 No Content is success
    if (response.ok || response.status === 204) {
      console.log(`✅ Webhook unsubscribed`);
      return true;
    }

    const error = await response.json();
    console.error('Failed to unsubscribe webhook:', error);
    return false;

  } catch (error) {
    console.error('Error unsubscribing webhook:', error);
    return false;
  }
}

/**
 * List all registered webhooks
 */
export async function listWebhooks(): Promise<Array<{ id: string; url: string; valid: boolean }>> {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      console.error('TWITTER_BEARER_TOKEN not found');
      return [];
    }

    const response = await fetch('https://api.twitter.com/2/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to list webhooks:', error);
      return [];
    }

    const data = await response.json();
    return data.data || [];

  } catch (error) {
    console.error('Error listing webhooks:', error);
    return [];
  }
}
