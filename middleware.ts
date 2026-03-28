import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Feature flag: set AUTH_ENABLED=true in env to enforce Clerk login
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/privacy',
  '/terms',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!AUTH_ENABLED) return NextResponse.next();
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
