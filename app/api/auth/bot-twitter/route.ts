/**
 * OAuth endpoint to initiate bot account connection
 * This endpoint starts the Twitter OAuth flow for connecting a bot account
 *
 * IMPORTANT: To use this endpoint, you need to:
 * 1. Go to https://developer.twitter.com/en/portal/dashboard
 * 2. Select your app
 * 3. Go to "User authentication settings"
 * 4. Enable OAuth 1.0a
 * 5. Add callback URL: https://xbot.poap.studio/api/auth/bot-twitter/callback
 * 6. Set App permissions to "Read and write"
 */

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getAppUrl, getBotOAuthCallbackUrl } from '@/lib/config/app-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      console.error('Twitter API credentials not configured');
      return NextResponse.redirect(
        `${getAppUrl()}/admin?error=twitter_not_configured`
      );
    }

    console.log('Initializing Twitter OAuth flow...');

    const callbackUrl = getBotOAuthCallbackUrl();
    console.log('Callback URL:', callbackUrl);

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    console.log('Generating auth link...');

    // Generate auth link
    const authLink = await client.generateAuthLink(callbackUrl, {
      linkMode: 'authorize', // Force re-authorization to get fresh tokens
    });

    console.log('Auth link generated successfully');
    console.log('Redirecting to:', authLink.url);

    // Store oauth_token_secret in a secure way
    const response = NextResponse.redirect(authLink.url);

    // Store in cookie for callback (encrypted)
    // IMPORTANT: sameSite must be 'none' to allow cookies in cross-site redirects from Twitter
    response.cookies.set('oauth_token_secret', authLink.oauth_token_secret, {
      httpOnly: true,
      secure: true, // Required when sameSite is 'none'
      sameSite: 'none',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    response.cookies.set('oauth_token', authLink.oauth_token, {
      httpOnly: true,
      secure: true, // Required when sameSite is 'none'
      sameSite: 'none',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error initiating bot Twitter OAuth:', error);

    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Log detailed error for debugging
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', JSON.stringify(error, null, 2));
    }

    return NextResponse.redirect(
      `${getAppUrl()}/admin?error=${encodeURIComponent(errorMessage)}`
    );
  }
}
