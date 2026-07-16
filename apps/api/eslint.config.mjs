import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "src/generated/**"],
  },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Exact legacy allowlist. New files must keep no-explicit-any enabled.
    // Remove individual entries as these call sites gain typed interfaces.
    files: [
      "scripts/export-vocab.ts",
      "scripts/seed.ts",
      "src/auth/admin-jwt.guard.ts",
      "src/module/admin/admin-auth.controller.ts",
      "src/module/admin/admin-mappers.ts",
      "src/module/admin/admin.controller.ts",
      "src/module/admin/admin.service.ts",
      "src/support/decorators/filter-parse.decorator.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
