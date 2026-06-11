import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Middleware for server-side route protection
 * 
 * Protects dashboard routes by checking and verifying the authentication token
 * Redirects unauthenticated or invalidly authenticated users to login page
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value || request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Dashboard routes - require staff/admin token
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
        const { payload } = await jwtVerify(token, secret);
        if (payload && (payload.role === 'hr' || payload.role === 'super_admin')) {
          isValid = true;
        }
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
      response.cookies.delete('access_token');
      response.cookies.delete('token');
      return response;
    }
  }

  // 2. Interview routes - require candidate interview JWT (except access page)
  if (pathname.startsWith('/interview') && pathname !== '/interview/access' && pathname !== '/interview/access/') {
    const interviewToken = request.cookies.get('interview_token')?.value;
    let isValid = false;

    if (interviewToken) {
      try {
        const secretKey = process.env.INTERVIEW_JWT_SECRET || (process.env.JWT_SECRET ? process.env.JWT_SECRET + "_interview" : "");
        if (secretKey) {
          const secret = new TextEncoder().encode(secretKey);
          const { payload } = await jwtVerify(interviewToken, secret);
          if (payload && payload.role === 'interview') {
            isValid = true;
          }
        }
      } catch (err) {
        console.error('Interview JWT verification failed in middleware:', err);
      }
    }

    if (!isValid) {
      const basePath = request.nextUrl.basePath || '';
      const accessUrl = new URL(`${basePath}/interview/access/`, request.url);
      const response = NextResponse.redirect(accessUrl);
      response.cookies.delete('interview_token');
      return response;
    }
  }

  // 3. Offer routes - require a token parameter in the URL
  if (pathname.startsWith('/offer')) {
    const offerToken = request.nextUrl.searchParams.get('token');
    if (!offerToken) {
      const basePath = request.nextUrl.basePath || '';
      return NextResponse.redirect(new URL(`${basePath}/support`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/interview/:path*',
    '/offer/:path*',
  ],
};
