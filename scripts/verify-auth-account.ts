/**
 * Verify which Twitter account is authenticated
 * Usage: npx tsx scripts/verify-auth-account.ts
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

async function verifyAuthAccount() {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.error('❌ Missing Twitter OAuth 1.0a credentials');
      process.exit(1);
    }

    console.log('🔍 Verifying authenticated account...\n');

    const verifyUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';

    const authHeader = generateOAuthHeader(
      'GET',
      verifyUrl,
      apiKey,
      apiSecret,
      accessToken,
      accessSecret
    );

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      console.error(`❌ Error: ${response.status}`);
      const text = await response.text();
      console.error(text);
      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ Authenticated account:');
    console.log(`   Username: @${data.screen_name}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   ID: ${data.id_str}`);
    console.log('');
    console.log('💡 This is the account that will receive webhook events');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyAuthAccount();
