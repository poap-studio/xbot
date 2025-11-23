/**
 * Admin session utilities
 * Verifies admin authentication via session cookie
 */

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin-session');

    if (!sessionCookie?.value) {
      return false;
    }

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
    );

    // Verify JWT token
    await jwtVerify(sessionCookie.value, secret);

    return true;
  } catch (error) {
    // Token is invalid or expired
    return false;
  }
}
