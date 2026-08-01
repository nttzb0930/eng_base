"use client";

import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  formatToeicDictationPlaybackSpeed,
  TOEIC_DICTATION_PLAYBACK_SPEEDS,
  type ToeicDictationPlaybackSpeed,
} from "@/app/features/toeic-dictation/playback-speed";

type Props = {
  value: ToeicDictationPlaybackSpeed;
  onValueChange: (speed: ToeicDictationPlaybackSpeed) => void;
};

export function PlaybackSpeedSelect({ value, onValueChange }: Props) {
  const t = useTranslations("toeicDictation.session");

  return (
    <Select
      value={String(value)}
      onValueChange={(nextValue) =>
        onValueChange(Number(nextValue) as ToeicDictationPlaybackSpeed)
      }
    >
      <SelectTrigger
        className="h-9 w-[72px] rounded-md border-0 bg-transparent px-2 font-mono text-xs shadow-none hover:bg-muted focus:ring-0 focus:ring-offset-0"
        aria-label={t("playbackSpeed", {
          speed: formatToeicDictationPlaybackSpeed(value),
        })}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[72px]">
        {TOEIC_DICTATION_PLAYBACK_SPEEDS.map((speed) => (
          <SelectItem key={speed} value={String(speed)} className="font-mono text-xs">
            {formatToeicDictationPlaybackSpeed(speed)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
