import type { UserProgress } from "@repo/shared";

export function resolvePostAuthRedirect(
  progress: UserProgress | null | undefined
) {
  if (progress?.isPlacementTestConfirmed && progress.activeCourse) {
    return "/learn";
  }

  return "/placement-test";
}
