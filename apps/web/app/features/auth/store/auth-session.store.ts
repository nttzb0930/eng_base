import type { AuthSession } from "../types/auth.types";

let session: AuthSession = { accessToken: null, user: null };
const listeners = new Set<() => void>();

export const getAuthSession = () => session;
export const subscribeAuthSession = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export function setAuthSession(next: AuthSession) {
  session = next;
  listeners.forEach((listener) => listener());
}
export function setAccessToken(accessToken: string | null) {
  setAuthSession({ ...session, accessToken });
}
export function clearAuthSession() {
  setAuthSession({ accessToken: null, user: null });
}
