/**
 * POAP OAuth2 Client
 * Handles OAuth2 client credentials flow with automatic token renewal
 * Tokens expire after 24 hours and are automatically renewed
 * Credentials are loaded from environment variables (POAP_CLIENT_ID, POAP_CLIENT_SECRET)
 */

import prisma from '@/lib/prisma';

const POAP_AUTH_URL = 'https://auth.accounts.poap.xyz/oauth/token';
const POAP_AUDIENCE = 'https://api.poap.tech';
const TOKEN_EXPIRY_HOURS = 24;
// Renew token 1 hour before expiry to avoid edge cases
const RENEWAL_BUFFER_HOURS = 1;

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

interface PoapCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Get POAP API credentials from environment variables
 * @throws {Error} If credentials are not configured
 */
async function getCredentials(): Promise<PoapCredentials> {
  const clientId = process.env.POAP_CLIENT_ID?.trim();
  const clientSecret = process.env.POAP_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      'POAP API credentials not configured. Please set POAP_CLIENT_ID and POAP_CLIENT_SECRET environment variables.'
    );
  }

  return { clientId, clientSecret };
}

/**
 * Request a new OAuth2 access token from POAP
 * @returns {Promise<OAuthTokenResponse>} Token response
 * @throws {Error} If token request fails
 */
async function requestNewToken(): Promise<OAuthTokenResponse> {
  const { clientId, clientSecret } = await getCredentials();

  console.log('[POAP Auth] Requesting new OAuth token...');
  console.log(`[POAP Auth] Client ID: ${clientId?.substring(0, 10)}...`);

  const response = await fetch(POAP_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audience: POAP_AUDIENCE,
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[POAP Auth] Token request failed: ${response.status}`);
    console.error(`[POAP Auth] Error details: ${errorText}`);
    throw new Error(
      `POAP OAuth2 token request failed: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  const data: OAuthTokenResponse = await response.json();

  if (!data.access_token) {
    console.error('[POAP Auth] Response missing access_token:', data);
    throw new Error('POAP OAuth2 response missing access_token');
  }

  console.log(`[POAP Auth] Token obtained successfully (expires in ${data.expires_in}s)`);
  return data;
}

/**
 * Store new token in database
 * @param {string} accessToken - The OAuth2 access token
 * @param {number} expiresIn - Token lifetime in seconds
 */
async function storeToken(accessToken: string, expiresIn: number): Promise<void> {
  // Calculate expiry time
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Delete old tokens and store new one
  await prisma.$transaction(async (tx) => {
    // Remove all existing tokens
    await tx.poapAuth.deleteMany({});

    // Store new token
    await tx.poapAuth.create({
      data: {
        accessToken,
        expiresAt,
      },
    });
  });

  console.log(`POAP token stored, expires at: ${expiresAt.toISOString()}`);
}

/**
 * Check if current token is still valid
 * @param {Date} expiresAt - Token expiry time
 * @returns {boolean} True if token is still valid (with buffer)
 */
function isTokenValid(expiresAt: Date): boolean {
  const now = new Date();
  const bufferTime = new Date(
    expiresAt.getTime() - RENEWAL_BUFFER_HOURS * 60 * 60 * 1000
  );

  return now < bufferTime;
}

/**
 * Get current token from database
 * @returns {Promise<string | null>} Token if valid, null otherwise
 */
async function getCurrentToken(): Promise<string | null> {
  const auth = await prisma.poapAuth.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!auth) {
    return null;
  }

  if (!isTokenValid(auth.expiresAt)) {
    console.log('POAP token expired or near expiry, needs renewal');
    return null;
  }

  return auth.accessToken;
}

/**
 * Renew OAuth2 token
 * Requests new token and stores it in database
 * @returns {Promise<string>} New access token
 */
export async function renewToken(): Promise<string> {
  console.log('Renewing POAP OAuth2 token...');

  const tokenResponse = await requestNewToken();
  await storeToken(tokenResponse.access_token, tokenResponse.expires_in);

  return tokenResponse.access_token;
}

/**
 * Get a valid OAuth2 access token
 * Returns cached token if still valid, otherwise renews it
 * @returns {Promise<string>} Valid access token
 * @throws {Error} If unable to get or renew token
 */
export async function getValidToken(): Promise<string> {
  try {
    // Try to get current token
    const currentToken = await getCurrentToken();

    if (currentToken) {
      return currentToken;
    }

    // Token expired or doesn't exist, renew it
    return await renewToken();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get valid POAP token: ${error.message}`);
    }
    throw new Error('Failed to get valid POAP token: Unknown error');
  }
}

/**
 * Validate that POAP credentials are configured
 * @returns {Promise<boolean>} True if configured and valid
 * @throws {Error} If credentials are not configured or invalid
 */
export async function validateCredentials(): Promise<boolean> {
  await getCredentials(); // This will throw if not configured
  return true;
}

/**
 * Initialize POAP authentication
 * Should be called on app startup to ensure we have a valid token
 * @returns {Promise<string>} Access token
 */
export async function initializePoapAuth(): Promise<string> {
  console.log('Initializing POAP authentication...');

  try {
    const token = await getValidToken();
    console.log('POAP authentication initialized successfully');
    return token;
  } catch (error) {
    console.error('Failed to initialize POAP authentication:', error);
    throw error;
  }
}
