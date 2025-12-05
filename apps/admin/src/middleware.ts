import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login'];
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/sites',
  '/billing',
  '/account',
  '/tenant',
  '/tenants',
  '/collections',
  '/media',
  '/types',
  '/users',
  '/settings',
];

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    const json = JSON.parse(decoded);
    if (!json?.exp) return false;
    return Date.now() >= json.exp * 1000;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.includes(path)) return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  if (!isProtected) return NextResponse.next();

  const authCookie = request.cookies.get('authToken');
  if (!authCookie || isJwtExpired(authCookie.value)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
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

