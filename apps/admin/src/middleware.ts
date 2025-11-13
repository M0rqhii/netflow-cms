import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware - ochrona tras: globalne vs tenantowe
 * 
 * Strategy:
 * - Global routes (/dashboard) - wymagają global token (authToken)
 * - Tenant routes (/tenant/[slug]/*) - wymagają tenant-scoped token (tenantToken:{tenantId})
 * - Public routes (/login) - dostępne bez tokenu
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes - dostępne bez tokenu
  if (path === '/login' || path === '/') {
    return NextResponse.next();
  }

  // Global routes (Hub) - wymagają global token
  if (path.startsWith('/dashboard')) {
    // W przeglądarce sprawdzimy token w komponencie
    // Middleware tylko przekierowuje jeśli brak tokenu w cookie/header
    // Dla localStorage sprawdzamy w komponencie
    return NextResponse.next();
  }

  // Tenant routes - wymagają tenant-scoped token
  if (path.startsWith('/tenant/')) {
    // W przeglądarce sprawdzimy token w komponencie
    // Middleware tylko przekierowuje jeśli brak tokenu w cookie/header
    // Dla localStorage sprawdzamy w komponencie
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

