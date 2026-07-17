import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

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

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
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
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...privateSharedPatterns,
            {
              regex: "^@/(?:src/)?features/courses(?:/|$)",
              message:
                "The rejected src/features Courses profile is closed; use app/features and app/views.",
            },
            {
              regex:
                "^@/(?:src/)?(?:services|views)/(?:courses|units|lessons|challenges|challenge-options)(?:/|$)",
              message:
                "Legacy src Course buckets are closed; follow the app/features + app/views EC profile.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
