/**
 * OAuth 1.0a callback endpoint for bot account connection
 * Completes the Twitter OAuth flow and stores encrypted credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== BOT TWITTER OAUTH CALLBACK STARTED ===');

    const searchParams = request.nextUrl.searchParams;
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    // Get oauth_token_secret from cookie
    const oauthTokenSecret = request.cookies.get('oauth_token_secret')?.value;

    console.log('OAuth parameters:', {
      hasToken: !!oauthToken,
      hasVerifier: !!oauthVerifier,
      hasSecret: !!oauthTokenSecret,
      token: oauthToken?.substring(0, 10) + '...',
      verifier: oauthVerifier?.substring(0, 10) + '...',
    });

    // Validate parameters
    if (!oauthToken || !oauthVerifier || !oauthTokenSecret) {
      console.error('Missing OAuth parameters', {
        hasToken: !!oauthToken,
        hasVerifier: !!oauthVerifier,
        hasSecret: !!oauthTokenSecret,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin?error=oauth_params_missing`
      );
    }

    console.log('OAuth parameters validated successfully');

    // Validate environment variables
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      console.error('Twitter API credentials not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin?error=twitter_not_configured`
      );
    }

    // Initialize Twitter client with temporary credentials
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret,
    });

    // Exchange temporary credentials for permanent access tokens
    const {
      client: loggedClient,
      accessToken,
      accessSecret,
    } = await client.login(oauthVerifier);

    // Get authenticated user info
    const user = await loggedClient.v2.me({
      'user.fields': ['profile_image_url', 'description'],
    });

    if (!user.data) {
      console.error('Failed to get user data from Twitter');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin?error=twitter_user_fetch_failed`
      );
    }

    // Encrypt access tokens before storing
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedAccessSecret = encrypt(accessSecret);

    // Store bot account in database
    const botAccount = await prisma.botAccount.upsert({
      where: { twitterId: user.data.id },
      create: {
        twitterId: user.data.id,
        username: user.data.username,
        displayName: user.data.name,
        profileImageUrl: user.data.profile_image_url,
        accessToken: encryptedAccessToken,
        accessSecret: encryptedAccessSecret,
        isConnected: true,
        connectedAt: new Date(),
      },
      update: {
        username: user.data.username,
        displayName: user.data.name,
        profileImageUrl: user.data.profile_image_url,
        accessToken: encryptedAccessToken,
        accessSecret: encryptedAccessSecret,
        isConnected: true,
        connectedAt: new Date(),
      },
    });

    // Bot account is now created and can be assigned to projects
    // Projects can be updated separately to use this bot account
    console.log(`Bot account connected: @${user.data.username} (${user.data.id})`);

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin?success=bot_connected`
    );

    response.cookies.delete('oauth_token');
    response.cookies.delete('oauth_token_secret');

    return response;
  } catch (error) {
    console.error('=== BOT TWITTER OAUTH CALLBACK ERROR ===');
    console.error('Error:', error);

    let errorMessage = 'oauth_failed';

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      errorMessage = error.message;
    }

    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
    console.error('========================================');

    // Clear OAuth cookies on error
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin?error=${encodeURIComponent(errorMessage)}`
    );

    response.cookies.delete('oauth_token');
    response.cookies.delete('oauth_token_secret');

    return response;
  }
}
