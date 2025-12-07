/**
 * Twitter Webhook Endpoint
 * Handles CRC validation (GET) and webhook events (POST)
 * Stores all received data for analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

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

    // Get CRC token from query params
    const crcToken = request.nextUrl.searchParams.get('crc_token');

    console.log('CRC Token received:', crcToken ? 'YES' : 'NO');

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

    // Get all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log('Headers:', Object.keys(headers).join(', '));

    // Parse body
    let body: any = null;
    let eventType: string | null = null;

    try {
      body = await request.json();
      console.log('Body keys:', Object.keys(body).join(', '));

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

    } catch (e) {
      console.log('Could not parse body as JSON');
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
# Force redeploy
