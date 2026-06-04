"use client";

import { useEffect } from "react";
import { EMOJIS, emojiUrl } from "@/shared/emojis";

interface Props {
  value: string;
  onChange: (id: string) => void;
  /** Emoji ids already claimed by others in the room — shown disabled. */
  taken?: string[];
}

// Image-only avatar palette. Taken emojis (used by other players) grey out and
// can't be selected; the selection auto-resolves to the first available one so
// `value` is never stuck on a taken/empty id.
export default function EmojiPicker({ value, onChange, taken }: Props) {
  const takenSet = new Set(taken ?? []);

  useEffect(() => {
    const available = EMOJIS.filter((e) => !takenSet.has(e.id));
    if ((!value || takenSet.has(value)) && available.length > 0) {
      onChange(available[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, taken]);

  return (
    <div className="emoji-grid" role="radiogroup" aria-label="Choose your avatar">
      {EMOJIS.map((e) => {
        const selected = e.id === value;
        const disabled = takenSet.has(e.id) && !selected;
        return (
          <button
            type="button"
            key={e.id}
            role="radio"
            aria-checked={selected}
            aria-label={e.id}
            className={`emoji-cell${selected ? " is-selected" : ""}`}
            disabled={disabled}
            onClick={() => !disabled && onChange(e.id)}
          >
            <img className="emoji-img" src={emojiUrl(e.id)} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}
