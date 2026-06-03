"use client";

import { useState } from "react";

interface Props {
  code: string;
  error: string | null;
  onJoin: (name: string) => Promise<boolean>;
}

export default function JoinForm({ code, error, onJoin }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const ok = await onJoin(name.trim());
    if (!ok) setSubmitting(false);
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
        />
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={!name.trim() || submitting}>
          {submitting ? "Joining…" : "Join game"}
        </button>
      </form>
    </div>
  );
}
