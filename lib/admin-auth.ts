/**
 * Admin Authentication Utilities
 * Validates if a user has admin access
 */

import { auth } from '@/lib/auth';

/**
 * Check if the current session user is an admin
 * @returns {Promise<boolean>} True if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.username) {
    return false;
  }

  const adminUsername = process.env.ADMIN_TWITTER_USERNAME?.trim()?.toLowerCase();
  const userUsername = session.user.username.trim().toLowerCase();

  return adminUsername === userUsername;
}

/**
 * Check if a specific username is the admin
 * @param {string} username - Twitter username to check
 * @returns {boolean} True if username is admin
 */
export function isAdminUsername(username: string): boolean {
  const adminUsername = process.env.ADMIN_TWITTER_USERNAME?.trim()?.toLowerCase();
  const checkUsername = username.trim().toLowerCase();

  return adminUsername === checkUsername;
}

/**
 * Get the configured admin username
 * @returns {string} Admin username
 */
export function getAdminUsername(): string {
  return process.env.ADMIN_TWITTER_USERNAME?.trim() || '';
}
