"use client";

import { useEffect } from "react";
import { playSfx } from "@/lib/sfx";

/**
 * Global UI click sound. Delegates from a single document listener instead of
 * wiring an onClick into every button, so new buttons get it for free. Plays
 * on the same gesture that triggered the click, so it isn't blocked by
 * autoplay restrictions.
 */
export default function ClickSound() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("button, [role='button']")) return;
      playSfx("/click-2.mp3");
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
