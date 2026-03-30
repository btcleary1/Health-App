import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/webauthn/auth-options',
  '/api/auth/webauthn/auth-verify',
  '/api/debug',
  '/privacy',
  '/terms',
];

// All other /api/auth/* and /api/health-data/* and /api/admin/* routes require session (handled below)

function isPublic(req: NextRequest) {
  return PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  if (isPublic(req)) return NextResponse.next();

  const token = req.cookies.get('health_session')?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Forward userId as a header for API routes that need it
  const res = NextResponse.next();
  res.headers.set('x-user-id', session.userId);
  res.headers.set('x-user-email', session.email);
  res.headers.set('x-user-role', session.role);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
