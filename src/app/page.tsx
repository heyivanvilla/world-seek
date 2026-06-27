"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { emitAck } from "@/lib/socket";
import { saveSession } from "@/lib/session";
import { DEFAULT_EMOJI } from "@/shared/emojis";
import EmojiPicker from "@/components/EmojiPicker";
import type { CreateAck } from "@/shared/types";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [textChat, setTextChat] = useState(true);
  const [voiceChat, setVoiceChat] = useState(false);

  async function startGame() {
    if (!name.trim() || busy) return;
    setBusy(true);
    const res = await emitAck<CreateAck>("game:create", {
      gmName: name.trim(),
      gmEmoji: emoji,
      settings: { textChat, voiceChat },
    });
    saveSession(res.code, {
      sessionToken: res.sessionToken,
      playerId: res.playerId,
    });
    router.push(`/game/${res.code}`);
  }

  // Codes are 6 letters shown as "xxx-xxx". Strip anything that isn't a letter,
  // cap at 6, and manage the dash so the user never types it. It appears as soon
  // as the 3rd letter lands (showing "abr-", ready for the 4th) — but only when
  // typing forward, so a backspace at "abr-" can still delete the dash.
  function formatCode(raw: string): string {
    const letters = raw.toLowerCase().replace(/[^a-z]/g, "").slice(0, 6);
    if (letters.length < 3) return letters;
    if (letters.length === 3) {
      const deleting = raw.length < code.length;
      return deleting ? letters : `${letters}-`;
    }
    return `${letters.slice(0, 3)}-${letters.slice(3)}`;
  }

  function joinGame() {
    const c = code.trim().toLowerCase();
    if (!c) return;
    router.push(`/game/${encodeURIComponent(c)}`);
  }

  return (
    <div className="center-screen">
      {/* Desaturated, near-transparent looping background video. Drop the file at
          public/landing-bg.mp4 — it's served from "/landing-bg.mp4". Muted + loop +
          playsInline so it autoplays silently on every browser. */}
      <video
        className="bg-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        src="/landing-bg.mp4"
        ref={(el) => {
          // Play at half speed for a slow, ambient drift.
          if (el) el.playbackRate = 0.5;
        }}
      />
      {/* Film-grain texture layered over the blurred video + terracotta field. */}
      <div className="bg-texture" aria-hidden="true" />
      <div className="stack" style={{ width: 380, gap: 24, position: "relative", zIndex: 1 }}>
        <div className="stack" style={{ gap: 10, textAlign: "center" }}>
          <span className="eyebrow">Open World · Street View</span>
          <h1 className="title" style={{ fontSize: 46 }}>
            World Seek
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Hide somewhere in the world. Let your friends find you on Street View.
          </p>
        </div>

        <div className="card stack">
          <span className="eyebrow">#1 Start a new game</span>
          <input
            placeholder="Your name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startGame()}
            name="player-name"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
          />
          <span className="muted" style={{ fontSize: 13 }}>
            Pick your avatar
          </span>
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <div className="chat-toggles">
            <label className="chat-toggle-row">
              <span className="eyebrow">Text chat</span>
              <button
                type="button"
                className={`toggle-btn${textChat ? " toggle-btn--on" : ""}`}
                onClick={() => setTextChat((v) => !v)}
                aria-pressed={textChat}
              >
                {textChat ? "On" : "Off"}
              </button>
            </label>
            <label className="chat-toggle-row">
              <span className="eyebrow">Voice chat</span>
              <button
                type="button"
                className={`toggle-btn${voiceChat ? " toggle-btn--on" : ""}`}
                onClick={() => setVoiceChat((v) => !v)}
                aria-pressed={voiceChat}
              >
                {voiceChat ? "On" : "Off"}
              </button>
            </label>
          </div>
          <button disabled={!name.trim() || busy} onClick={startGame}>
            {busy ? "Creating…" : "Start game"}
          </button>
        </div>

        <div className="card stack">
          <span className="eyebrow">#2 Join with a code</span>
          <input
            placeholder="e.g. abr-tyr"
            value={code}
            maxLength={7}
            onChange={(e) => setCode(formatCode(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && joinGame()}
          />
          <button className="secondary" disabled={!code.trim()} onClick={joinGame}>
            Join game
          </button>
        </div>
      </div>
    </div>
  );
}
