/**
 * Script to register Twitter webhook via API
 * Usage: npx tsx scripts/register-webhook.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load production .env file
dotenv.config({ path: path.join(__dirname, '..', '.env.production.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const WEBHOOK_URL = 'https://twitterbot.poap.studio/api/webhooks/twitter';

async function registerWebhook() {
  try {
    console.log('🔄 Registering Twitter webhook...');
    console.log('Webhook URL:', WEBHOOK_URL);
    console.log('');

    // Get bearer token from environment
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      console.error('❌ TWITTER_BEARER_TOKEN not found in environment');
      console.log('\nTo generate a bearer token, you need:');
      console.log('1. Your API Key and API Secret');
      console.log('2. Call POST https://api.twitter.com/oauth2/token');
      console.log('3. With Basic Auth (base64(API_KEY:API_SECRET))');
      console.log('4. Body: grant_type=client_credentials');
      process.exit(1);
    }

    console.log('✅ Bearer token found');
    console.log('');

    // Register webhook
    console.log('📡 Calling Twitter API to register webhook...');

    const response = await fetch('https://api.twitter.com/2/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
      }),
    });

    const data = await response.json();

    console.log('');
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok) {
      console.log('✅ Webhook registered successfully!');
      console.log('Webhook ID:', data.data?.id || 'N/A');
      console.log('');
      console.log('⚠️  IMPORTANT:');
      console.log('Twitter webhooks receive ALL account activity events.');
      console.log('To filter by hashtag #gotoalberto2025, you need to:');
      console.log('1. Receive all tweet events in the webhook');
      console.log('2. Filter in your code for tweets containing the hashtag');
      console.log('');
      console.log('The webhook will now receive events when:');
      console.log('- Someone mentions your account');
      console.log('- Someone tweets (if subscribed to user activity)');
      console.log('- Someone sends a DM');
      console.log('- etc.');
    } else {
      console.error('❌ Failed to register webhook');

      if (response.status === 401) {
        console.log('\n🔐 Authentication failed. Please check:');
        console.log('1. TWITTER_BEARER_TOKEN is valid');
        console.log('2. Token has webhooks:write permission');
      } else if (response.status === 400) {
        console.log('\n⚠️  Bad request. Possible reasons:');
        console.log('1. Webhook URL is invalid');
        console.log('2. Webhook already registered');
        console.log('3. CRC validation failed');
      } else if (response.status === 403) {
        console.log('\n🚫 Access denied. Please check:');
        console.log('1. Your app has webhooks access enabled');
        console.log('2. You have an elevated Twitter API access level');
        console.log('3. Account Activity API is enabled for your app');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// List existing webhooks
async function listWebhooks() {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      return;
    }

    console.log('📋 Listing existing webhooks...');
    console.log('');

    const response = await fetch('https://api.twitter.com/2/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('Existing webhooks:', JSON.stringify(data, null, 2));
    console.log('');
    console.log('─'.repeat(60));
    console.log('');

  } catch (error) {
    console.error('Error listing webhooks:', error);
  }
}

// Main execution
(async () => {
  await listWebhooks();
  await registerWebhook();
})();
