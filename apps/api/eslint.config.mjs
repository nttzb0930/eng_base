import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const courseContractPaths = [
  {
    name: "@repo/shared",
    importNames: ["Course", "UnitRecord", "LessonRecord", "ChallengeOption"],
    message: "Import Course contracts from @repo/shared/courses.",
  },
];

const privateSharedPatterns = [
  {
    group: [
      "@repo/shared/src/**",
      "@repo/shared/dist/**",
      "**/packages/shared/src/**",
    ],
    message: "Import only declared @repo/shared package exports.",
  },
];

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
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: courseContractPaths,
          patterns: privateSharedPatterns,
        },
      ],
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/module/courses/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: courseContractPaths,
          patterns: [
            ...privateSharedPatterns,
            {
              regex: "^(?:\\.{1,2}/)+(?:module/)?courses/.+",
              message:
                "Import only the Courses module public entrypoint, not its internals.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/module/admin/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.type='MemberExpression'][object.property.name='prisma'][property.name=/^(courses|units|lessons|challenges|challenge_options)$/]",
          message: "Course-content persistence is owned by the Courses module.",
        },
      ],
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
      "src/module/placement-test/placement-test.controller.ts",
      "src/module/placement-test/placement-test.service.ts",
      "src/support/decorators/filter-parse.decorator.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
