import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sourceRoot = join(import.meta.dirname, "../src");
const authRoot = join(sourceRoot, "module/auth");

test("Auth Module separates behavior from delivery infrastructure", () => {
  for (const file of [
    "dto/login.dto.ts",
    "dto/register.dto.ts",
    "service/auth-token.service.ts",
    "service/password.service.ts",
    "use-cases/login-user.usecase.ts",
    "use-cases/register-user.usecase.ts",
    "use-cases/refresh-token.usecase.ts",
    "use-cases/logout-user.usecase.ts",
  ]) {
    assert.ok(existsSync(join(authRoot, file)), `${file} must exist`);
  }

  assert.equal(existsSync(join(authRoot, "admin-jwt.guard.ts")), false);
  assert.equal(existsSync(join(authRoot, "user-jwt.guard.ts")), false);
  assert.equal(
    existsSync(join(authRoot, "auth-context.interceptor.ts")),
    false
  );
  assert.equal(existsSync(join(authRoot, "request-auth.ts")), false);

  assert.ok(existsSync(join(sourceRoot, "common/guards/admin-jwt.guard.ts")));
  assert.ok(existsSync(join(sourceRoot, "common/guards/user-jwt.guard.ts")));
  assert.equal(existsSync(join(sourceRoot, "common/auth-context")), false);
  assert.ok(
    existsSync(
      join(sourceRoot, "common/decorators/current-user-id.decorator.ts")
    )
  );
  assert.equal(
    existsSync(join(authRoot, "service/auth-session.service.ts")),
    false
  );
  assert.equal(
    existsSync(join(sourceRoot, "module/admin/admin-auth.controller.ts")),
    false
  );
  assert.ok(existsSync(join(authRoot, "admin-auth.controller.ts")));
});

test("Actor identity is delivered explicitly and ambient auth is forbidden", () => {
  const moduleRoot = join(sourceRoot, "module");
  const sources = readdirSync(moduleRoot, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".ts"));

  for (const file of sources) {
    const source = readFileSync(join(moduleRoot, file), "utf8");
    assert.doesNotMatch(source, /auth-context|\bauth\s*\(\s*\)/, file);
  }

  const appModule = readFileSync(join(sourceRoot, "app.module.ts"), "utf8");
  assert.doesNotMatch(appModule, /AuthContextInterceptor/);
});

test("Auth delivery adapters delegate instead of owning persistence and crypto", () => {
  const authController = readFileSync(
    join(authRoot, "auth.controller.ts"),
    "utf8"
  );
  const adminController = readFileSync(
    join(authRoot, "admin-auth.controller.ts"),
    "utf8"
  );

  for (const source of [authController, adminController]) {
    assert.doesNotMatch(source, /PrismaService|this\.prisma|signJwt|verifyJwt/);
  }
  assert.match(authController, /LoginUserUseCase/);
  assert.match(authController, /RegisterUserUseCase/);
  assert.match(authController, /RefreshTokenUseCase/);
  assert.match(authController, /LogoutUserUseCase/);
  assert.match(adminController, /LoginUserUseCase/);
  assert.doesNotMatch(authController + adminController, /AuthSessionService/);
});

test("Auth root exposes a small public Interface", () => {
  const publicInterface = readFileSync(join(authRoot, "index.ts"), "utf8");

  assert.match(publicInterface, /AuthModule/);
  assert.doesNotMatch(
    publicInterface,
    /Guard|Interceptor|signJwt|verifyJwt|hashPassword|request-auth|currentUser/
  );
});
