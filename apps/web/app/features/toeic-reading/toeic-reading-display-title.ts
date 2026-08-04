const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function toeicReadingDisplayTitle(input: {
  sourceSetName: string;
  testTitle: string;
}) {
  const sourceSetName = input.sourceSetName.trim();
  const testTitle = input.testTitle.trim();

  if (!sourceSetName || UUID_PATTERN.test(sourceSetName)) return testTitle;
  return `${sourceSetName} / ${testTitle}`;
}
