/**
 * Twitter Webhook Endpoint
 * Handles CRC validation (GET) and webhook events (POST)
 * Stores all received data for analysis and processes tweet mentions
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { processWebhookTweetEvent } from '@/lib/twitter/webhook-processor';

export const dynamic = 'force-dynamic';

/**
 * GET - Handle CRC (Challenge Response Check) from Twitter
 * Twitter sends: GET /webhooks/twitter?crc_token=xxx
 * We respond: {"response_token": "sha256=base64_encoded_hmac_hash"}
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('=== TWITTER WEBHOOK CRC REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full URL:', request.url);

    // Log IP and user agent for debugging
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.log('IP Address:', ipAddress);
    console.log('User Agent:', userAgent);

    // Get CRC token from query params
    const crcToken = request.nextUrl.searchParams.get('crc_token');

    console.log('CRC Token received:', crcToken ? 'YES' : 'NO');
    if (crcToken) {
      console.log('CRC Token (first 20 chars):', crcToken.substring(0, 20) + '...');
    }

    // Get all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Get query params
    const queryParams: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Store the CRC request in database for analysis
    await prisma.twitterWebhookEvent.create({
      data: {
        method: 'GET',
        path: request.nextUrl.pathname,
        headers,
        queryParams,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        eventType: 'CRC_VALIDATION',
      },
    });

    if (!crcToken) {
      console.error('No CRC token provided');
      return NextResponse.json(
        { error: 'Missing crc_token parameter' },
        { status: 400 }
      );
    }

    // Get Twitter consumer secret from environment
    const consumerSecret = process.env.TWITTER_API_SECRET;

    if (!consumerSecret) {
      console.error('TWITTER_API_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create HMAC SHA-256 hash
    // Message: crc_token
    // Key: consumer secret
    const hmac = crypto
      .createHmac('sha256', consumerSecret)
      .update(crcToken)
      .digest('base64');

    const responseToken = `sha256=${hmac}`;

    console.log('CRC response generated successfully');
    console.log(`Processing time: ${Date.now() - startTime}ms`);
    console.log('=====================================');

    return NextResponse.json({
      response_token: responseToken,
    });

  } catch (error) {
    console.error('=== TWITTER WEBHOOK CRC ERROR ===');
    console.error(error);
    console.error(`Processing time: ${Date.now() - startTime}ms`);
    console.error('=================================');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Handle webhook events from Twitter
 * Stores all received events for analysis
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('=== TWITTER WEBHOOK EVENT RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full URL:', request.url);

    // Log IP and origin for debugging
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const origin = request.headers.get('origin') || 'none';
    console.log('IP Address:', ipAddress);
    console.log('User Agent:', userAgent);
    console.log('Origin:', origin);

    // Get all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log('Headers received:', Object.keys(headers).join(', '));
    console.log('X-Twitter-Webhooks-Signature:', headers['x-twitter-webhooks-signature'] || 'NOT PRESENT');

    // Parse body
    let body: any = null;
    let eventType: string | null = null;

    try {
      body = await request.json();
      console.log('Body keys:', Object.keys(body).join(', '));

      // Log full payload for debugging (first 2000 chars to avoid excessive logging)
      const bodyString = JSON.stringify(body, null, 2);
      console.log('Full webhook payload:', bodyString.substring(0, 2000) + (bodyString.length > 2000 ? '... (truncated)' : ''));

      // Try to detect event type
      if (body.tweet_create_events) eventType = 'TWEET_CREATE';
      else if (body.favorite_events) eventType = 'FAVORITE';
      else if (body.follow_events) eventType = 'FOLLOW';
      else if (body.direct_message_events) eventType = 'DIRECT_MESSAGE';
      else if (body.tweet_delete_events) eventType = 'TWEET_DELETE';
      else if (body.user_event) eventType = 'USER_EVENT';
      else if (body.for_user_id) eventType = 'ACCOUNT_ACTIVITY';
      else eventType = 'UNKNOWN';

      console.log('Detected event type:', eventType);

      // Log specific details for tweet create events
      if (eventType === 'TWEET_CREATE' && body.tweet_create_events) {
        console.log(`Number of tweets in event: ${body.tweet_create_events.length}`);
        body.tweet_create_events.forEach((tweet: any, index: number) => {
          console.log(`Tweet ${index + 1}:`, {
            id: tweet.id_str,
            author: `@${tweet.user?.screen_name}` || 'unknown',
            text: tweet.text?.substring(0, 100) || 'no text',
            created_at: tweet.created_at,
            has_hashtags: Boolean(tweet.entities?.hashtags?.length),
            has_media: Boolean(tweet.entities?.media?.length),
            mentions_count: tweet.entities?.user_mentions?.length || 0,
          });
        });
        console.log('Bot account ID (for_user_id):', body.for_user_id);
      }

    } catch (e) {
      console.error('Error parsing body as JSON:', e);
      // Note: Can't read request body again after failed JSON parse attempt
      console.error('Failed to parse webhook body - body may be malformed');
    }

    // Store the event in database
    const event = await prisma.twitterWebhookEvent.create({
      data: {
        method: 'POST',
        path: request.nextUrl.pathname,
        headers,
        body,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        eventType: eventType || undefined,
      },
    });

    console.log('Event stored with ID:', event.id);

    // Process tweet create events (mentions)
    if (eventType === 'TWEET_CREATE' && body.tweet_create_events) {
      console.log('[Webhook] Processing TWEET_CREATE event...');

      // Process synchronously to ensure completion before function terminates
      // This prevents silent failures when serverless function times out
      try {
        const result = await processWebhookTweetEvent(body);
        console.log(`[Webhook] Processing completed: ${result.processed} processed, ${result.skipped} skipped, ${result.errors.length} errors`);
        if (result.errors.length > 0) {
          console.error('[Webhook] Errors:', result.errors);
        }
      } catch (error) {
        console.error('[Webhook] Error in processing:', error);
        // Still return 200 to avoid Twitter retries on our internal errors
      }
    }

    console.log(`Processing time: ${Date.now() - startTime}ms`);
    console.log('======================================');

    // Respond with 200 OK
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('=== TWITTER WEBHOOK EVENT ERROR ===');
    console.error(error);
    console.error(`Processing time: ${Date.now() - startTime}ms`);
    console.error('===================================');

    // Still return 200 to avoid Twitter retries
    return NextResponse.json({ success: false });
  }
}
