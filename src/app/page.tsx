"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { emitAck } from "@/lib/socket";
import { saveSession } from "@/lib/session";
import type { CreateAck } from "@/shared/types";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function startGame() {
    if (!name.trim() || busy) return;
    setBusy(true);
    const res = await emitAck<CreateAck>("game:create", { gmName: name.trim() });
    saveSession(res.code, {
      sessionToken: res.sessionToken,
      playerId: res.playerId,
    });
    router.push(`/game/${res.code}`);
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
        <div className="stack" style={{ gap: 10 }}>
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
          />
          <button disabled={!name.trim() || busy} onClick={startGame}>
            {busy ? "Creating…" : "Start game"}
          </button>
        </div>

        <div className="card stack">
          <span className="eyebrow">#2 Join with a code</span>
          <input
            placeholder="e.g. abr-tyr"
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
