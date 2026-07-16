import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

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
          paths: courseContractPaths,
          patterns: privateSharedPatterns,
        },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    ignores: ["src/features/courses/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: courseContractPaths,
          patterns: [
            ...privateSharedPatterns,
            {
              regex: "^@/(?:src/)?features/courses/.+",
              message:
                "Import the Courses feature through @/src/features/courses.",
            },
            {
              regex: "^(?:\\.{1,2}/)+(?:src/)?features/courses(?:/.+)?$",
              message:
                "Route and sibling capabilities must import Courses through @/src/features/courses.",
            },
            {
              regex:
                "^@/(?:src/)?(?:services|views)/(?:courses|units|lessons|challenges|challenge-options)(?:/|$)",
              message:
                "Legacy Course technical buckets are closed; use @/src/features/courses.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
