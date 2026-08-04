"use client";

import { ImageOff, Loader2 } from "lucide-react";

import { useToeicListeningMediaUrl } from "../hooks/use-toeic-listening-media-url";

type ToeicListeningMediaImageProps = {
  mediaId: number;
  alt: string;
};

export function ToeicListeningMediaImage({
  mediaId,
  alt,
}: ToeicListeningMediaImageProps) {
  const media = useToeicListeningMediaUrl(mediaId);
  if (media.loading) {
    return (
      <div className="bg-muted flex min-h-48 items-center justify-center rounded-xl">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      </div>
    );
  }
  if (media.error || !media.url) {
    return (
      <div className="bg-muted text-muted-foreground flex min-h-48 items-center justify-center rounded-xl">
        <ImageOff className="h-7 w-7" aria-hidden="true" />
      </div>
    );
  }
  return (
    // Protected media is loaded through the authenticated API as a Blob URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.url}
      alt={alt}
      className="mx-auto max-h-[420px] w-auto rounded-xl object-contain"
    />
  );
}
