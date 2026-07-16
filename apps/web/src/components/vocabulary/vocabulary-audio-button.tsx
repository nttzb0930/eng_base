"use client";

import { Volume2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/src/components/ui/button";

type VocabularyAudioButtonProps = {
  audioUrl: string;
  label: string;
};

export const VocabularyAudioButton = ({
  audioUrl,
  label,
}: VocabularyAudioButtonProps) => {
  const [playing, setPlaying] = useState(false);

  const onPlay = () => {
    const audio = new Audio(audioUrl);

    setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    void audio.play().catch(() => setPlaying(false));
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onPlay}
      disabled={playing}
      aria-label={`Play pronunciation for ${label}`}
      title={`Play pronunciation for ${label}`}
      className="h-8 w-8 shrink-0 rounded-full"
    >
      <Volume2 className="h-4 w-4" />
    </Button>
  );
};
