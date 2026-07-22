import type { PlacementOnboardingData } from "../types/placement-test.types";

export const ONBOARDING_FLOW_VERSION = 2;
export const ONBOARDING_TOTAL_STEPS = 5;

export function resolveInitialOnboardingStep(
  initialStep?: number,
  initialData?: PlacementOnboardingData,
) {
  const boundedStep = Math.min(
    ONBOARDING_TOTAL_STEPS,
    Math.max(1, Math.trunc(initialStep ?? 1)),
  );

  if (initialData?.flowVersion === ONBOARDING_FLOW_VERSION) {
    return boundedStep;
  }

  return boundedStep > 1
    ? Math.min(ONBOARDING_TOTAL_STEPS, boundedStep + 1)
    : 1;
}

export function getOnboardingStepMessageKey(step: number) {
  return step === 1 ? "systemLanguage" : `step${step - 1}`;
}
