export function assertDevelopmentSeedAllowed(environment: NodeJS.ProcessEnv) {
  if (environment.NODE_ENV === "production") {
    throw new Error(
      "db:seed:dev is development-only and cannot run in production"
    );
  }
}
