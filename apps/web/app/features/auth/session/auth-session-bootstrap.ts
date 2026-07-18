import type { LoginResponse } from "../types/auth.types";

export type AuthSessionBootstrapDependencies = {
  hasRefreshSession(): boolean;
  refresh(): Promise<LoginResponse>;
  setAuthenticated(result: LoginResponse): void;
  clearSession(): void;
  setUnauthenticated(): void;
};

export function createAuthSessionBootstrap(
  dependencies: AuthSessionBootstrapDependencies,
) {
  let runPromise: Promise<void> | undefined;

  async function initialize() {
    if (!dependencies.hasRefreshSession()) {
      dependencies.clearSession();
      dependencies.setUnauthenticated();
      return;
    }

    try {
      const result = await dependencies.refresh();
      dependencies.setAuthenticated(result);
    } catch {
      dependencies.clearSession();
      dependencies.setUnauthenticated();
    }
  }

  return {
    run() {
      runPromise ??= initialize();
      return runPromise;
    },
  };
}
