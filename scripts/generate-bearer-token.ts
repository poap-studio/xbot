/**
 * Generate Twitter Bearer Token from API credentials
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load production .env file
dotenv.config({ path: path.join(__dirname, '..', '.env.production.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function generateBearerToken() {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('❌ TWITTER_API_KEY or TWITTER_API_SECRET not found');
      process.exit(1);
    }

    console.log('🔑 Generating Bearer Token...');
    console.log('');

    // Create Basic Auth credentials (base64 encoded API_KEY:API_SECRET)
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // Request bearer token
    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      console.log('✅ Bearer Token generated successfully!');
      console.log('');
      console.log('Token:', data.access_token);
      console.log('Type:', data.token_type);
      console.log('');
      console.log('💾 Save this to your .env file:');
      console.log(`TWITTER_BEARER_TOKEN=${data.access_token}`);
      console.log('');

      return data.access_token;
    } else {
      console.error('❌ Failed to generate bearer token');
      console.error('Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateBearerToken();
