import { NextRequest, NextResponse } from 'next/server';

// Feature flag: controlled via code
const AUTH_ENABLED = true;

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/webauthn', '/privacy', '/terms'];

function isPublic(req: NextRequest) {
  return PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next();
  if (isPublic(req)) return NextResponse.next();

  const authed = req.cookies.get('app_auth')?.value === 'granted';
  if (!authed) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
