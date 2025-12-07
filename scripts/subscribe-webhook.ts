/**
 * Subscribe to webhook events using OAuth 1.0a
 * Usage: npx tsx scripts/subscribe-webhook.ts
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
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate signature
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

async function subscribeWebhook() {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.error('❌ Missing Twitter OAuth 1.0a credentials');
      console.log('\nRequired environment variables:');
      console.log('- TWITTER_API_KEY');
      console.log('- TWITTER_API_SECRET');
      console.log('- TWITTER_ACCESS_TOKEN');
      console.log('- TWITTER_ACCESS_SECRET');
      process.exit(1);
    }

    console.log('✅ OAuth 1.0a credentials found\n');

    // First, get the webhook ID
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
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

    // Subscribe using OAuth 1.0a (Account Activity API)
    const subscribeUrl = `https://api.twitter.com/2/account_activity/webhooks/${webhookId}/subscriptions/all`;

    console.log('🔐 Creating subscription with OAuth 1.0a...\n');
    console.log(`Subscribing to: ${subscribeUrl}\n`);

    const authHeader = generateOAuthHeader(
      'POST',
      subscribeUrl,
      apiKey,
      apiSecret,
      accessToken,
      accessSecret
    );

    const subscribeResponse = await fetch(subscribeUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', subscribeResponse.status);

    const responseText = await subscribeResponse.text();
    console.log('Response:', responseText || '(empty)');

    if (subscribeResponse.ok || subscribeResponse.status === 204) {
      console.log('\n✅ Subscription created successfully!');
      console.log('\n💡 The webhook should now receive events for:');
      console.log('- Mentions');
      console.log('- Replies');
      console.log('- Direct messages');
      console.log('- And more...');
    } else {
      console.log('\n❌ Failed to create subscription');
      console.log('\nThis might mean:');
      console.log('1. Account Activity API access is not enabled for your app');
      console.log('2. The webhook endpoint needs different configuration');
      console.log('3. V2 webhooks work differently than Account Activity API');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

subscribeWebhook();
