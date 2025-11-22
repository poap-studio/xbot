/**
 * OAuth 1.0a endpoint to initiate bot account connection
 * This endpoint starts the Twitter OAuth flow for connecting a bot account
 */

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      console.error('Twitter API credentials not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin?error=twitter_not_configured`
      );
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('NEXT_PUBLIC_APP_URL not configured');
      return NextResponse.redirect('/admin?error=app_url_not_configured');
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/bot-twitter/callback`;

    // Generate auth link
    const authLink = await client.generateAuthLink(callbackUrl, {
      linkMode: 'authorize', // Force re-authorization to get fresh tokens
    });

    // Store oauth_token_secret in a secure way
    // For production, use encrypted session or Redis
    // For now, we'll pass it as a query parameter (will be replaced by session in production)
    const response = NextResponse.redirect(authLink.url);

    // Store in cookie for callback (encrypted)
    response.cookies.set('oauth_token_secret', authLink.oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    response.cookies.set('oauth_token', authLink.oauth_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error initiating bot Twitter OAuth:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin?error=${encodeURIComponent(errorMessage)}`
    );
  }
}
