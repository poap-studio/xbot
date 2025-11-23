/**
 * Test script to verify POAP API integration
 * Tests OAuth token generation and QR code retrieval
 */

require('dotenv').config({ path: '.env.production' });

const EVENT_ID = '214604';
const EDIT_CODE = '678397';

async function getOAuthToken() {
  console.log('🔑 Step 1: Getting OAuth token...');

  const clientId = process.env.POAP_CLIENT_ID?.trim();
  const clientSecret = process.env.POAP_CLIENT_SECRET?.trim();

  console.log(`   Client ID: ${clientId?.substring(0, 10)}...`);
  console.log(`   Client Secret: ${clientSecret?.substring(0, 10)}...`);

  const response = await fetch('https://auth.accounts.poap.xyz/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audience: 'https://api.poap.tech',
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth token request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`   ✅ Token obtained (expires in ${data.expires_in}s)`);
  console.log(`   Token scope: ${data.scope}`);
  console.log(`   Token permissions:`, data.permissions || 'N/A');

  return data.access_token;
}

async function getEventQRCodes(token, eventId, editCode) {
  console.log(`\n📦 Step 2: Getting QR codes for event ${eventId}...`);

  const apiKey = process.env.POAP_API_KEY?.trim();
  console.log(`   API Key: ${apiKey?.substring(0, 20)}...`);
  console.log(`   Edit Code: ${editCode}`);

  const response = await fetch(`https://api.poap.tech/event/${eventId}/qr-codes`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      secret_code: editCode,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QR codes request failed: ${response.status} - ${errorText}`);
  }

  const qrCodes = await response.json();
  console.log(`   ✅ Found ${qrCodes.length} QR codes`);

  // Show stats
  const available = qrCodes.filter(qr => !qr.claimed).length;
  const claimed = qrCodes.filter(qr => qr.claimed).length;
  console.log(`   📊 Stats: ${available} available, ${claimed} claimed`);

  return qrCodes;
}

async function getQRSecret(token, qrHash) {
  const apiKey = process.env.POAP_API_KEY?.trim();

  const response = await fetch(`https://api.poap.tech/actions/claim-qr?qr_hash=${qrHash}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Get secret failed for ${qrHash}: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.secret;
}

async function main() {
  try {
    console.log('🚀 POAP API Integration Test\n');
    console.log('=' .repeat(60));

    // Step 1: Get OAuth token
    const token = await getOAuthToken();

    // Step 2: Get QR codes
    const qrCodes = await getEventQRCodes(token, EVENT_ID, EDIT_CODE);

    // Step 3: Get secret for first available QR code
    const availableQR = qrCodes.find(qr => !qr.claimed);

    if (availableQR) {
      console.log(`\n🔐 Step 3: Getting secret for QR code ${availableQR.qr_hash}...`);
      const secret = await getQRSecret(token, availableQR.qr_hash);
      console.log(`   ✅ Secret obtained: ${secret.substring(0, 20)}...`);
      console.log(`   🔗 Mint link: https://poap.xyz/claim/${availableQR.qr_hash}`);
    } else {
      console.log(`\n⚠️  No available QR codes to test secret retrieval`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!\n');

    // Summary
    console.log('📋 Summary:');
    console.log(`   Event ID: ${EVENT_ID}`);
    console.log(`   Total QR codes: ${qrCodes.length}`);
    console.log(`   Available: ${qrCodes.filter(qr => !qr.claimed).length}`);
    console.log(`   Claimed: ${qrCodes.filter(qr => qr.claimed).length}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
