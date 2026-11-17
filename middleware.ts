import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { TERMS_VERSION } from '@/lib/legal';

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
  '/api/auth/google',
];

// Until someone agrees to the current Terms and gives health data consent, only these work.
const AGREE_OK = ['/agree', '/api/terms/', '/api/auth/'];

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

  // Agreement gate (Cleary suite legal baseline): everyone, admins included, agrees to the
  // current Terms version and consents to health data collection before using the app.
  const { pathname, search } = req.nextUrl;
  if (session.tv !== TERMS_VERSION && !AGREE_OK.some(p => pathname.startsWith(p))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Please agree to the Terms and health data consent first.' }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/agree';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
