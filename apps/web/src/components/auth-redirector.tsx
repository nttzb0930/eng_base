import { redirect } from "next/navigation";

type AuthRedirectorProps = {
  locale: string;
};

/**
 * Server-side redirect used when a protected query reports an invalid session.
 * Local auth cleanup is handled by the provider/interceptor; navigation must not
 * mount a client effect or call the logout endpoint again.
 */
export function AuthRedirector({ locale }: AuthRedirectorProps) {
  const prefix = locale === "vi" ? "/vi" : "/en";
  redirect(`${prefix}/sign-in`);
  return null;
}
