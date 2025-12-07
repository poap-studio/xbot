/**
 * Subscribe a specific bot account to the webhook
 * Uses the bot's OAuth credentials from database
 */

import prisma from '../lib/prisma';
import { decrypt } from '../lib/crypto';
import crypto from 'crypto';

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

async function subscribeBotToWebhook() {
  try {
    console.log('=== SUBSCRIBE BOT TO WEBHOOK ===\n');

    // Get API credentials from environment
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('❌ Missing TWITTER_API_KEY or TWITTER_API_SECRET');
      process.exit(1);
    }

    // Get bot account from database
    const bot = await prisma.botAccount.findUnique({
      where: { twitterId: '1460606890392629248' }, // @poapstudio
    });

    if (!bot) {
      console.error('❌ Bot @poapstudio not found in database');
      process.exit(1);
    }

    console.log(`✅ Found bot: @${bot.username}`);
    console.log(`   Twitter ID: ${bot.twitterId}`);
    console.log(`   Webhook ID: ${bot.webhookId || 'NOT SET'}\n`);

    if (!bot.webhookId) {
      console.error('❌ Bot does not have webhookId set');
      console.log('   Run this first to set it:');
      console.log('   npx tsx -e "import prisma from \'./lib/prisma\'; (async () => { await prisma.botAccount.update({ where: { twitterId: \'1460606890392629248\' }, data: { webhookId: \'1997725575138418689\' } }); await prisma.$disconnect(); })();"');
      process.exit(1);
    }

    // Decrypt OAuth credentials
    console.log('🔐 Decrypting OAuth credentials...');
    const accessToken = decrypt(bot.accessToken);
    const accessSecret = decrypt(bot.accessSecret);
    console.log('✅ Credentials decrypted\n');

    // Subscribe to webhook
    const subscribeUrl = `https://api.twitter.com/2/account_activity/webhooks/${bot.webhookId}/subscriptions/all`;

    console.log(`📡 Subscribing to webhook...`);
    console.log(`   URL: ${subscribeUrl}\n`);

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

    console.log(`Response status: ${response.status}`);

    const responseText = await response.text();
    console.log(`Response: ${responseText || '(empty)'}\n`);

    if (response.ok || response.status === 204) {
      console.log('✅ Subscription successful!');
      console.log('\n💡 The webhook should now receive events for @' + bot.username);
      console.log('   Including:');
      console.log('   - Mentions');
      console.log('   - Replies');
      console.log('   - Direct messages');
    } else {
      console.log('❌ Subscription failed');
      console.log('\nPossible reasons:');
      console.log('1. Account Activity API not enabled');
      console.log('2. Already subscribed');
      console.log('3. Invalid credentials');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

subscribeBotToWebhook();
