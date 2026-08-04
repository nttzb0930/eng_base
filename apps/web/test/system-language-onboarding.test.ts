import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  getOnboardingStepMessageKey,
  ONBOARDING_TOTAL_STEPS,
  resolveInitialOnboardingStep,
} from "../app/features/placement-test/onboarding/onboarding-flow";

const webRoot = join(import.meta.dirname, "..");

test("new onboarding has five steps and maps display messages", () => {
  assert.equal(ONBOARDING_TOTAL_STEPS, 5);
  assert.deepEqual(
    [1, 2, 3, 4, 5].map(getOnboardingStepMessageKey),
    ["systemLanguage", "step1", "step2", "step3", "step4"],
  );
});

test("onboarding resumes version two directly and shifts legacy progress", () => {
  assert.equal(resolveInitialOnboardingStep(1, undefined), 1);
  assert.equal(
    resolveInitialOnboardingStep(2, { selectedLangs: ["en"] }),
    3,
  );
  assert.equal(
    resolveInitialOnboardingStep(4, { selectedLangs: ["en"] }),
    5,
  );
  assert.equal(resolveInitialOnboardingStep(2, { flowVersion: 2 }), 2);
  assert.equal(resolveInitialOnboardingStep(99, { flowVersion: 2 }), 5);
});

test("locale catalogs expose matching system-language onboarding copy", () => {
  const en = JSON.parse(
    readFileSync(join(webRoot, "app/messages/en.json"), "utf8"),
  );
  const vi = JSON.parse(
    readFileSync(join(webRoot, "app/messages/vi.json"), "utf8"),
  );
  const enStep = en.placementTest.newOnboarding.systemLanguage;
  const viStep = vi.placementTest.newOnboarding.systemLanguage;

  assert.deepEqual(Object.keys(enStep).sort(), Object.keys(viStep).sort());
  assert.equal(
    en.placementTest.newOnboarding.stepProgress,
    "STEP {step} / 5",
  );
  assert.equal(
    vi.placementTest.newOnboarding.stepProgress,
    "BƯỚC {step} / 5",
  );
});

test("system language choices are semantic pressed buttons", () => {
  const componentPath = join(
    webRoot,
    "app/features/placement-test/onboarding/SystemLanguageStep.tsx",
  );
  assert.equal(existsSync(componentPath), true);

  const source = readFileSync(componentPath, "utf8");
  assert.match(source, /<button/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /onSelectLocale/);
});

test("system language choices use repository-owned decorative flag assets", () => {
  assert.equal(existsSync(join(webRoot, "public/flags/gb.svg")), true);
  assert.equal(existsSync(join(webRoot, "public/flags/vn.svg")), true);

  const source = readFileSync(
    join(
      webRoot,
      "app/features/placement-test/onboarding/SystemLanguageStep.tsx",
    ),
    "utf8",
  );

  assert.match(source, /import Image from "next\/image"/);
  assert.match(source, /flagSrc: "\/flags\/gb\.svg"/);
  assert.match(source, /flagSrc: "\/flags\/vn\.svg"/);
  assert.match(source, /<Image/);
  assert.match(source, /alt=""/);
});

test("new user onboarding composes locale selection into the five-step flow", () => {
  const source = readFileSync(
    join(
      webRoot,
      "app/features/placement-test/onboarding/NewUserOnboarding.tsx",
    ),
    "utf8",
  );

  assert.match(source, /<SystemLanguageStep/);
  assert.match(source, /step === 1/);
  assert.match(source, /step === 2 && selectedLangs\.length === 0/);
  assert.match(source, /ONBOARDING_TOTAL_STEPS/);
  assert.match(source, /flowVersion: ONBOARDING_FLOW_VERSION/);
  assert.match(source, /writeLocalePreference/);
  assert.match(source, /buildLocalePreferencePath/);
});
