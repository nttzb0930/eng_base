import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

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
    files: ["src/**/*.ts"],
    ignores: ["src/module/vocabulary/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...privateSharedPatterns,
            {
              regex: "^(?:\\.{1,2}/)+(?:module/)?vocabulary/.+",
              message:
                "Import only the Vocabulary module public Interface, not its implementation files.",
            },
          ],
        },
      ],
    },
  },
  {
    // Exact legacy allowlist. New files must keep no-explicit-any enabled.
    // Remove individual entries as these call sites gain typed interfaces.
    files: [
      "scripts/export-vocab.ts",
      "src/module/placement-test/placement-test.controller.ts",
      "src/module/placement-test/placement-test.service.ts",
      "src/common/decorators/filter-parse.decorator.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
