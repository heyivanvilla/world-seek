"use client";

import { useEffect, useState } from "react";
import { DEFAULT_EMOJI, EMOJIS } from "@/shared/emojis";
import EmojiPicker from "./EmojiPicker";

interface Props {
  code: string;
  error: string | null;
  onJoin: (
    name: string,
    emoji: string,
  ) => Promise<{ ok: boolean; takenEmojis?: string[] }>;
  /** Pre-join read of emojis already claimed in this room. */
  onPeek: () => Promise<string[]>;
}

export default function JoinForm({ code, error, onJoin, onPeek }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [taken, setTaken] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load which avatars are already taken so the picker can grey them out.
  useEffect(() => {
    let cancelled = false;
    onPeek().then((t) => {
      if (!cancelled) setTaken(t);
    });
    return () => {
      cancelled = true;
    };
  }, [onPeek]);

  const allTaken = taken.length >= EMOJIS.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || allTaken) return;
    setSubmitting(true);
    const res = await onJoin(name.trim(), emoji);
    if (!res.ok) {
      // Refresh disabled avatars if we lost an emoji race.
      if (res.takenEmojis) setTaken(res.takenEmojis);
      setSubmitting(false);
    }
  }

  return (
    <div className="center-screen">
      <form className="card stack" style={{ width: 360 }} onSubmit={submit}>
        <h1 className="title">Join the hunt</h1>
        <p className="muted">
          Game <span className="code-pill">{code}</span>
        </p>
        <input
          autoFocus
          placeholder="Pick a name"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          name="player-name"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
        />
        <span className="muted" style={{ fontSize: 13 }}>
          Pick your avatar
        </span>
        <EmojiPicker value={emoji} onChange={setEmoji} taken={taken} />
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
        {allTaken && (
          <p style={{ color: "var(--danger)", margin: 0 }}>
            No avatars left in this game.
          </p>
        )}
        <button type="submit" disabled={!name.trim() || allTaken || submitting}>
          {submitting ? "Joining…" : "Join game"}
        </button>
      </form>
    </div>
  );
}
