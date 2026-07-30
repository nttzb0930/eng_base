import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadReadingSourceRuntime } from "./reading-source.cli.js";

const sha = "a".repeat(64);

function repositoryRoot() {
  return mkdtempSync(join(tmpdir(), "reading-cli-"));
}

test("loads public source configuration without environment variables", () => {
  const previous = { ...process.env };
  delete process.env.READING_SOURCE_URL;
  delete process.env.READING_SOURCE_AUTHORIZATION;
  try {
    const runtime = loadReadingSourceRuntime({
      argv: ["--authorization=public-anon-value"],
      repositoryRoot: repositoryRoot(),
      requireAuthorization: true,
    });

    assert.equal(runtime.profile.source, "dautoeic");
    assert.match(runtime.profile.apiBaseUrl, /^https:\/\/.+\.supabase\.co$/u);
    assert.equal(runtime.authorization, "public-anon-value");
  } finally {
    process.env = previous;
  }
});

test("reads authorization from the private gitignored default file", () => {
  const root = repositoryRoot();
  const directory = join(root, "var", "licensed-content", "dautoeic");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "source-authorization.txt"), " file-value \n");

  const runtime = loadReadingSourceRuntime({
    argv: [],
    repositoryRoot: root,
    requireAuthorization: true,
  });

  assert.equal(runtime.authorization, "file-value");
});

test("CLI authorization takes precedence over the private file", () => {
  const root = repositoryRoot();
  const directory = join(root, "var", "licensed-content", "dautoeic");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "source-authorization.txt"), "file-value");

  const runtime = loadReadingSourceRuntime({
    argv: ["--authorization=cli-value"],
    repositoryRoot: root,
    requireAuthorization: true,
  });

  assert.equal(runtime.authorization, "cli-value");
});

test("requires a valid approved checksum only for download", () => {
  assert.throws(
    () =>
      loadReadingSourceRuntime({
        argv: ["--authorization=value", "--approved-sha=bad"],
        repositoryRoot: repositoryRoot(),
        requireAuthorization: true,
        requireApprovedSha: true,
      }),
    /approved-sha must be a lowercase SHA-256/u,
  );

  const runtime = loadReadingSourceRuntime({
    argv: [`--authorization=value`, `--approved-sha=${sha}`],
    repositoryRoot: repositoryRoot(),
    requireAuthorization: true,
    requireApprovedSha: true,
  });
  assert.equal(runtime.approvedSha256, sha);
});

test("rejects missing authorization without reading env fallback", () => {
  process.env.READING_SOURCE_AUTHORIZATION = "env-must-not-be-used";
  try {
    assert.throws(
      () =>
        loadReadingSourceRuntime({
          argv: [],
          repositoryRoot: repositoryRoot(),
          requireAuthorization: true,
        }),
      /--authorization or private authorization file is required/u,
    );
  } finally {
    delete process.env.READING_SOURCE_AUTHORIZATION;
  }
});
