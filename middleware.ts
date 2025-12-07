/**
 * Next.js Middleware
 * Protects admin routes with password authentication
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page and auth API endpoints without protection
  if (
    pathname === '/admin/login' ||
    pathname === '/admin/unauthorized' ||
    pathname.startsWith('/api/admin/auth/')
  ) {
    return NextResponse.next();
  }

  // Protect all /admin and /api/admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    // Check for admin session cookie
    const sessionCookie = request.cookies.get('admin-session');

    if (!sessionCookie?.value) {
      // No session, redirect to login
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    try {
      // Verify JWT token
      const secret = new TextEncoder().encode(
        process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
      );

      await jwtVerify(sessionCookie.value, secret);

      // Token is valid, allow access
      return NextResponse.next();
    } catch (error) {
      // Token is invalid or expired, redirect to login
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
