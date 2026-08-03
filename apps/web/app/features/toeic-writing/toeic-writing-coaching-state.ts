export function shouldConfirmCommunityRestore(localText: string): boolean {
  return localText.trim().length > 0;
}

export function canRestoreCommunityResponse(
  localText: string,
  confirmed: boolean
): boolean {
  return !shouldConfirmCommunityRestore(localText) || confirmed;
}

export function canLoadToeicWritingCoaching(
  taskId: number,
  contentVersion: string,
  open: boolean
): boolean {
  return (
    open &&
    Number.isInteger(taskId) &&
    taskId > 0 &&
    /^[a-f0-9]{64}$/u.test(contentVersion)
  );
}
