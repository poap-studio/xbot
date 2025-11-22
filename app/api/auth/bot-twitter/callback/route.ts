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
    const searchParams = request.nextUrl.searchParams;
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    // Get oauth_token_secret from cookie
    const oauthTokenSecret = request.cookies.get('oauth_token_secret')?.value;

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

    // Update or create config to use this bot account
    await prisma.config.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        poapEventId: '',
        poapSecretCode: '',
        botAccountId: botAccount.id,
      },
      update: {
        botAccountId: botAccount.id,
      },
    });

    console.log(`Bot account connected: @${user.data.username} (${user.data.id})`);

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin?success=bot_connected`
    );

    response.cookies.delete('oauth_token');
    response.cookies.delete('oauth_token_secret');

    return response;
  } catch (error) {
    console.error('Error in bot Twitter OAuth callback:', error);

    // Clear OAuth cookies on error
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin?error=oauth_failed`
    );

    response.cookies.delete('oauth_token');
    response.cookies.delete('oauth_token_secret');

    return response;
  }
}
