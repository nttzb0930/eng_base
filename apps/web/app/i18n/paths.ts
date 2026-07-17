import {
  defaultLocale,
  isLocale,
  type Locale,
} from "@/app/i18n/config";

const PUBLIC_PATH_PREFIXES = [
  "/api",
  "/_next",
  "/apple-icon.png",
  "/favicon.ico",
  "/icon1.png",
  "/icon2.png",
];

export const withLocale = (
  path: string,
  locale: Locale = defaultLocale
) => {
  if (path === "/") return `/${locale}`;

  const [pathname, suffix = ""] = path.split(/(?=[?#])/u, 2);
  const segments = pathname.split("/").filter(Boolean);
  const pathLocale = segments[0];

  if (pathLocale && isLocale(pathLocale)) {
    return `/${[locale, ...segments.slice(1)].join("/")}${suffix}`;
  }

  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
};

export const shouldSkipLocalePrefix = (pathname: string) => {
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return /\.[^/]+$/.test(pathname);
};
