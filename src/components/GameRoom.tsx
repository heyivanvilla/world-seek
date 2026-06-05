"use client";

import { useGame } from "@/lib/useGame";
import ExitControl from "./ExitControl";
import JoinForm from "./JoinForm";
import Lobby from "./Lobby";
import HidingPhase from "./HidingPhase";
import FindingPhase from "./FindingPhase";
import SoloLoading from "./SoloLoading";
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

  const phase = (() => {
    switch (s.phase) {
      case "lobby":
        return <Lobby state={s} onStart={game.start} />;
      case "hiding":
        return <HidingPhase state={s} onHide={game.hide} />;
      case "finding":
        // Solo rounds open with no location until the browser generates one.
        if (s.solo && !s.currentTarget) {
          return (
            <SoloLoading key={s.currentRound} onTarget={game.sendSoloTarget} />
          );
        }
        return (
          <FindingPhase
            key={s.currentRound}
            state={s}
            onGuess={game.guess}
            onPreview={game.previewGuess}
          />
        );
      case "results":
        return (
          <ResultsPhase key={s.currentRound} state={s} onNext={game.nextRound} />
        );
      case "finished":
        return <FinalScores state={s} onReturnToLobby={game.returnToLobby} />;
    }
  })();

  return (
    <>
      {phase}
      {/* Exit/leave control, present in every in-game phase. The host closes the
          game for everyone; everyone else just leaves and the rest keep playing. */}
      <ExitControl
        isGameMaster={s.youAreGameMaster}
        onLeave={game.leave}
        onClose={game.close}
      />
      {/* Surfaced when the socket drops (e.g. backgrounding the tab to send a
          text). Taps are queued and replayed on reconnect, so this tells the
          player to wait rather than hammering a button that looks dead. */}
      {!game.connected && <div className="reconnect-banner">Reconnecting…</div>}
    </>
  );
}
