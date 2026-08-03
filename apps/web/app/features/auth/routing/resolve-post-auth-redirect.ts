import type { UserProgress } from "@repo/shared";

export function resolvePostAuthRedirect(
  progress: UserProgress | null | undefined
) {
  if (!progress?.isPlacementTestConfirmed) return "/placement-test";
  if (!progress.activeCourse) return "/courses";

  return "/learn";
}
