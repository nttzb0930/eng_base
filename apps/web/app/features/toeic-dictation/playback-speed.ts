export const TOEIC_DICTATION_PLAYBACK_SPEEDS = [
  0.7,
  0.8,
  0.9,
  1,
  1.1,
  1.2,
  1.3,
  1.4,
] as const;

export type ToeicDictationPlaybackSpeed =
  (typeof TOEIC_DICTATION_PLAYBACK_SPEEDS)[number];

export function formatToeicDictationPlaybackSpeed(
  speed: ToeicDictationPlaybackSpeed
) {
  return `${speed}x`;
}
