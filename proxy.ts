import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/shared/i18n/config";
import { negotiateLocale } from "@/shared/i18n/negotiate-locale";

/**
 * Locale routing. Next.js 16 renamed Middleware to Proxy; this is that file.
 * Any path without a locale prefix is redirected to the visitor's preferred
 * supported language, defaulting to Spanish, with its query string intact.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";
  if (isLocale(firstSegment)) {
    return;
  }
  const locale = negotiateLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals and anything that looks like a static file
  matcher: ["/((?!_next|.*\\..*).*)"],
};
