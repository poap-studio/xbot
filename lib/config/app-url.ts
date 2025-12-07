/**
 * Get the application base URL
 * Uses NEXTAUTH_URL first (dynamic based on deployment domain),
 * then falls back to NEXT_PUBLIC_APP_URL
 *
 * This ensures the app works correctly across different deployment domains
 */
export function getAppUrl(): string {
  const url = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL)?.trim();

  if (!url) {
    throw new Error('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL must be configured');
  }

  return url;
}

/**
 * Get the webhook callback URL for Twitter
 */
export function getWebhookUrl(): string {
  return `${getAppUrl()}/api/webhooks/twitter`;
}

/**
 * Get the bot OAuth callback URL
 */
export function getBotOAuthCallbackUrl(): string {
  return `${getAppUrl()}/api/auth/bot-twitter/callback`;
}
