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
    const adminUsername = process.env.ADMIN_TWITTER_USERNAME?.trim()?.toLowerCase();
    const userUsername = session.user.username?.trim()?.toLowerCase();

    if (!adminUsername || adminUsername !== userUsername) {
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
