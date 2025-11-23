/**
 * Next.js Middleware
 * Protects admin routes and handles authentication
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login and unauthorized pages without protection
  if (pathname === '/admin/login' || pathname === '/admin/unauthorized') {
    return NextResponse.next();
  }

  // Protect all other /admin routes
  if (pathname.startsWith('/admin')) {
    const session = await auth();

    // If not logged in, redirect to login page
    if (!session?.user) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    // Check if user is authorized admin
    const adminUsernames = process.env.ADMIN_TWITTER_USERNAMES?.trim()?.toLowerCase();
    const userUsername = session.user.username?.trim()?.toLowerCase();

    if (!adminUsernames) {
      // No admin usernames configured
      const url = new URL('/admin/unauthorized', request.url);
      return NextResponse.redirect(url);
    }

    // Split by comma and check if user is in the list
    const allowedUsernames = adminUsernames.split(',').map(u => u.trim());
    if (!userUsername || !allowedUsernames.includes(userUsername)) {
      // User is logged in but not authorized
      const url = new URL('/admin/unauthorized', request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
