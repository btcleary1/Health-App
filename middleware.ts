import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// Feature flag: set AUTH_ENABLED=true in Vercel env to enforce login
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/privacy', '/terms'];

function isPublic(req: NextRequest) {
  return PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
}

export default clerkMiddleware(async (_auth, req) => {
  if (!AUTH_ENABLED) return NextResponse.next();
  if (isPublic(req)) return NextResponse.next();

  const authed = req.cookies.get('app_auth')?.value === 'granted';
  if (!authed) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
