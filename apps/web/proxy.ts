import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/app/i18n/config";
import { shouldSkipLocalePrefix } from "@/app/i18n/paths";

const publicRoutes = [
  /^\/$/,
  /^\/[a-z]{2}$/,
  /^\/sign-in/,
  /^\/[a-z]{2}\/sign-in/,
  /^\/sign-up/,
  /^\/[a-z]{2}\/sign-up/,
];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => route.test(pathname));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0] ?? "";
  const secondSegment = segments[1] ?? "";

  // 1. Handle double locale segments or missing locale prefixes
  if (isLocale(firstSegment) && isLocale(secondSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${[secondSegment, ...segments.slice(2)].join("/")}`;
    return NextResponse.redirect(url);
  }

  if (!shouldSkipLocalePrefix(pathname) && !isLocale(firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // 2. Authentication check
  const token = request.cookies.get("client_has_rt")?.value;
  const locale = isLocale(firstSegment) ? firstSegment : defaultLocale;

  const isAuthRoute =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    (isLocale(firstSegment) &&
      (secondSegment === "sign-in" || secondSegment === "sign-up"));

  if (token && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/learn`;
    return NextResponse.redirect(url);
  }

  if (!token && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    return NextResponse.redirect(url);
  }

  // 3. Set header for next-intl locale context
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-lingo-locale",
    isLocale(firstSegment) ? firstSegment : defaultLocale
  );

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
export default proxy;
