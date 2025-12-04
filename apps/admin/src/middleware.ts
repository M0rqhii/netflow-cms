import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware - ochrona tras: globalne vs tenantowe
 * 
 * Strategy:
 * - Global routes (/dashboard, /sites) - wymagają global token (authToken)
 * - Tenant routes (/tenant/[slug]/*) - wymagają tenant-scoped token (tenantToken:{tenantId})
 * - Public routes (/login) - dostępne bez tokenu
 * 
 * Note: i18n is handled client-side via IntlProvider, not through URL routing
 * Note: Main authentication check is done client-side via AuthGuard component
 * Middleware can optionally check cookies/headers, but localStorage is checked in components
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes - dostępne bez tokenu
  if (path === '/login' || path === '/') {
    return NextResponse.next();
  }

  // Optional: Check for token in cookie (if backend sets it)
  // For now, we rely on client-side AuthGuard for localStorage check
  const authCookie = request.cookies.get('authToken');
  
  // Log access attempts without token (for debugging)
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && !authCookie) {
    console.log(`[Middleware] Access attempt to ${path} without auth cookie`);
  }

  // Global routes (Hub, Sites) - wymagają global token
  if (path.startsWith('/dashboard') || path.startsWith('/sites') || path.startsWith('/billing') || path.startsWith('/account')) {
    // Main check is done in AuthGuard component (client-side)
    // Middleware can optionally redirect if no cookie, but we allow to let AuthGuard handle it
    return NextResponse.next();
  }

  // Tenant routes - wymagają tenant-scoped token
  if (path.startsWith('/tenant/')) {
    // Main check is done in AuthGuard component (client-side)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

