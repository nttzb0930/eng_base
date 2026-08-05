export type ProductionAdminBootstrapConfig = {
  email: string;
  username: string;
  password: string;
  fullName: string;
};

export function readProductionAdminConfig(
  env: NodeJS.ProcessEnv = process.env,
): ProductionAdminBootstrapConfig {
  const missing = [
    ["ADMIN_BOOTSTRAP_EMAIL", env.ADMIN_BOOTSTRAP_EMAIL],
    ["ADMIN_BOOTSTRAP_USERNAME", env.ADMIN_BOOTSTRAP_USERNAME],
    ["ADMIN_BOOTSTRAP_PASSWORD", env.ADMIN_BOOTSTRAP_PASSWORD],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required production admin configuration: ${missing.join(", ")}`);
  }

  const email = env.ADMIN_BOOTSTRAP_EMAIL!.trim();
  const username = env.ADMIN_BOOTSTRAP_USERNAME!.trim();
  const password = env.ADMIN_BOOTSTRAP_PASSWORD!;
  const fullName = (env.ADMIN_BOOTSTRAP_FULL_NAME ?? "Production Admin").trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL must be a valid email address");
  }
  if (username.length < 3) {
    throw new Error("ADMIN_BOOTSTRAP_USERNAME must be at least 3 characters");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters");
  }
  if (!fullName) {
    throw new Error("ADMIN_BOOTSTRAP_FULL_NAME must not be empty");
  }

  return { email, username, password, fullName };
}
