"use client";

import { useGame } from "@/lib/useGame";
import JoinForm from "./JoinForm";
import Lobby from "./Lobby";
import HidingPhase from "./HidingPhase";
import FindingPhase from "./FindingPhase";
import ResultsPhase from "./ResultsPhase";
import FinalScores from "./FinalScores";

export default function GameRoom({ code }: { code: string }) {
  const game = useGame(code);

  if (game.status === "connecting") {
    return (
      <div className="center-screen">
        <p className="muted">Connecting…</p>
      </div>
    );
  }

  if (game.status === "need-join" || !game.state) {
    return (
      <JoinForm
        code={code}
        error={game.error}
        onJoin={game.join}
        onPeek={game.peek}
      />
    );
  }

  const s = game.state;

  switch (s.phase) {
    case "lobby":
      return <Lobby state={s} onStart={game.start} />;
    case "hiding":
      return <HidingPhase state={s} onHide={game.hide} />;
    case "finding":
      return (
        <FindingPhase key={s.currentRound} state={s} onGuess={game.guess} />
      );
    case "results":
      return <ResultsPhase key={s.currentRound} state={s} onNext={game.nextRound} />;
    case "finished":
      return <FinalScores state={s} onReturnToLobby={game.returnToLobby} />;
  }
}
