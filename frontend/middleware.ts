import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Middleware for server-side route protection
 * 
 * Protects dashboard routes by checking and verifying the authentication token
 * Redirects unauthenticated or invalidly authenticated users to login page
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value || request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Protected routes - require authentication
  if (pathname.startsWith('/dashboard')) {
    let isValid = false;

    if (token) {
      try {
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) {
          console.error('JWT_SECRET is not configured on the server.');
          return NextResponse.redirect(new URL('/auth/login?error=config', request.url));
        }
        const secret = new TextEncoder().encode(secretKey);
        await jwtVerify(token, secret);
        isValid = true;
      } catch (err) {
        console.error('JWT verification failed in middleware:', err);
      }
    }

    if (!isValid) {
      const basePath = request.nextUrl.basePath || '';
      const loginUrl = new URL(`${basePath}/auth/login`, request.url);
      loginUrl.searchParams.set('expired', 'true');
      loginUrl.searchParams.set('from', pathname);
      loginUrl.searchParams.set('redirect', pathname);
      
      const response = NextResponse.redirect(loginUrl);
      // Clean up invalid cookies to prevent redirect loops
      response.cookies.delete('access_token');
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
};
