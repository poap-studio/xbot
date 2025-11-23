/**
 * Admin Authentication Utilities
 * Validates if a user has admin access
 */

import { auth } from '@/lib/auth';

/**
 * Get list of allowed admin usernames
 * @returns {string[]} Array of allowed admin usernames
 */
export function getAdminUsernames(): string[] {
  const adminUsernames = process.env.ADMIN_TWITTER_USERNAMES?.trim()?.toLowerCase();
  if (!adminUsernames) {
    return [];
  }
  return adminUsernames.split(',').map(u => u.trim()).filter(u => u.length > 0);
}

/**
 * Check if the current session user is an admin
 * @returns {Promise<boolean>} True if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.username) {
    return false;
  }

  const allowedUsernames = getAdminUsernames();
  const userUsername = session.user.username.trim().toLowerCase();

  return allowedUsernames.includes(userUsername);
}

/**
 * Check if a specific username is an admin
 * @param {string} username - Twitter username to check
 * @returns {boolean} True if username is admin
 */
export function isAdminUsername(username: string): boolean {
  const allowedUsernames = getAdminUsernames();
  const checkUsername = username.trim().toLowerCase();

  return allowedUsernames.includes(checkUsername);
}

/**
 * Get the configured admin usernames (comma-separated)
 * @returns {string} Comma-separated admin usernames
 */
export function getAdminUsernamesString(): string {
  return process.env.ADMIN_TWITTER_USERNAMES?.trim() || '';
}
