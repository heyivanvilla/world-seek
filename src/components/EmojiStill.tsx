"use client";

import { useEffect, useRef } from "react";
import { emojiUrl } from "@/shared/emojis";

// A frozen (non-animated) rendering of an emoji. We draw the source image's first
// frame once onto a canvas, so animated GIFs show a still in calmer UI chrome
// (rosters, name lists, banners) — only the map markers stay animated. Drawing
// into a square buffer with contain handles any source size/ratio.
const BUFFER = 128;

export default function EmojiStill({
  emoji,
  className,
}: {
  emoji: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.min(BUFFER / img.naturalWidth, BUFFER / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, BUFFER, BUFFER);
      ctx.drawImage(img, (BUFFER - w) / 2, (BUFFER - h) / 2, w, h);
    };
    img.src = emojiUrl(emoji);
    return () => {
      cancelled = true;
    };
  }, [emoji]);

  return (
    <canvas
      ref={ref}
      width={BUFFER}
      height={BUFFER}
      className={className}
      aria-hidden="true"
    />
  );
}
