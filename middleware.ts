import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/webauthn/auth-options',
  '/api/auth/webauthn/auth-verify',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/forgot-password',
  '/privacy',
  '/terms',
];

function isPublic(req: NextRequest) {
  return PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  if (isPublic(req)) return NextResponse.next();

  const token = req.cookies.get('health_session')?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

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
