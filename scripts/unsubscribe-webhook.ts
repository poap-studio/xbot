/**
 * Unsubscribe from webhook events using OAuth 1.0a
 * Usage: npx tsx scripts/unsubscribe-webhook.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import crypto from 'crypto';

// Load production .env file
dotenv.config({ path: path.join(__dirname, '..', '.env.production.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// OAuth 1.0a signature generation
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

async function unsubscribeWebhook() {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret || !bearerToken) {
      console.error('❌ Missing Twitter credentials');
      process.exit(1);
    }

    console.log('✅ OAuth 1.0a credentials found\n');

    // Get webhook ID
    const webhooksResponse = await fetch('https://api.twitter.com/2/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    const webhooksData = await webhooksResponse.json();

    if (!webhooksData.data || webhooksData.data.length === 0) {
      console.error('❌ No webhooks registered');
      process.exit(1);
    }

    const webhookId = webhooksData.data[0].id;
    console.log(`📡 Webhook ID: ${webhookId}\n`);

    // Unsubscribe using OAuth 1.0a
    const unsubscribeUrl = `https://api.twitter.com/2/account_activity/webhooks/${webhookId}/subscriptions/all`;

    console.log('🗑️  Removing subscription...\n');

    const authHeader = generateOAuthHeader(
      'DELETE',
      unsubscribeUrl,
      apiKey,
      apiSecret,
      accessToken,
      accessSecret
    );

    const unsubscribeResponse = await fetch(unsubscribeUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
    });

    console.log('Response status:', unsubscribeResponse.status);

    const responseText = await unsubscribeResponse.text();
    console.log('Response:', responseText || '(empty)');

    if (unsubscribeResponse.ok || unsubscribeResponse.status === 204) {
      console.log('\n✅ Subscription removed successfully!');
    } else {
      console.log('\n❌ Failed to remove subscription');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

unsubscribeWebhook();
