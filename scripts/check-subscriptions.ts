/**
 * Check Twitter webhook subscriptions
 * Usage: npx tsx scripts/check-subscriptions.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load production .env file
dotenv.config({ path: path.join(__dirname, '..', '.env.production.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkSubscriptions() {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      console.error('❌ TWITTER_BEARER_TOKEN not found in environment');
      process.exit(1);
    }

    console.log('📋 Checking webhook subscriptions...\n');

    // List webhooks first
    const webhooksResponse = await fetch('https://api.twitter.com/2/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    const webhooksData = await webhooksResponse.json();
    console.log('Webhooks:', JSON.stringify(webhooksData, null, 2));
    console.log('\n' + '─'.repeat(60) + '\n');

    // If we have webhooks, check subscriptions
    if (webhooksData.data && webhooksData.data.length > 0) {
      const webhookId = webhooksData.data[0].id;

      console.log(`📡 Checking subscriptions for webhook ${webhookId}...\n`);

      // Note: This endpoint might require OAuth 1.0a user context
      // The endpoint format might be different for v2
      const subscriptionsResponse = await fetch(
        `https://api.twitter.com/2/webhooks/${webhookId}/subscriptions`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
          },
        }
      );

      const subscriptionsData = await subscriptionsResponse.json();
      console.log('Subscriptions Response:');
      console.log(JSON.stringify(subscriptionsData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSubscriptions();
