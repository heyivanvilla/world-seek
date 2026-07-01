"use client";

import { useGame } from "@/lib/useGame";
import { useTextChat } from "@/lib/useTextChat";
import { useVoiceChat } from "@/lib/useVoiceChat";
import GameMenu from "./GameMenu";
import JoinForm from "./JoinForm";
import Lobby from "./Lobby";
import HidingPhase from "./HidingPhase";
import FindingPhase from "./FindingPhase";
import SoloLoading from "./SoloLoading";
import ResultsPhase from "./ResultsPhase";
import FinalScores from "./FinalScores";
import TextChat from "./TextChat";
import VoiceChat from "./VoiceChat";

export default function GameRoom({ code }: { code: string }) {
  const game = useGame(code);

  const textChatEnabled = game.state?.settings.textChat ?? false;
  const voiceChatEnabled = game.state?.settings.voiceChat ?? false;

  const textChat = useTextChat(textChatEnabled);
  const voice = useVoiceChat(
    voiceChatEnabled,
    game.state?.players ?? [],
    game.state?.youId ?? "",
  );

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
        return <Lobby state={s} onStart={game.start} speakingIds={voice.speakingIds} />;
      case "hiding":
        return <HidingPhase state={s} onHide={game.hide} speakingIds={voice.speakingIds} />;
      case "finding":
        if (s.solo && !s.currentTarget) {
          return (
            <SoloLoading key={s.currentRound} onTarget={game.sendSoloTarget} />
          );
        }
        return (
          <FindingPhase
            state={s}
            onGuess={game.guess}
            onPreview={game.previewGuess}
          />
        );
      case "results":
        return <ResultsPhase state={s} onNext={game.nextRound} />;
      case "finished":
        return <FinalScores state={s} onReturnToLobby={game.returnToLobby} />;
    }
  })();

  return (
    <>
      {phase}
      <GameMenu
        isGameMaster={s.youAreGameMaster}
        onLeave={game.leave}
        onClose={game.close}
      />
      {!game.connected && <div className="reconnect-banner">Reconnecting…</div>}

      {/* Voice strip — sits above the chat button */}
      {voiceChatEnabled && (
        <VoiceChat {...voice} myId={s.youId} />
      )}

      {/* Text chat panel — fixed bottom-right */}
      {textChatEnabled && (
        <TextChat
          messages={textChat.messages}
          onSend={textChat.send}
          unreadCount={textChat.unreadCount}
          onSetOpen={textChat.setOpen}
          hasVoice={voiceChatEnabled}
        />
      )}
    </>
  );
}
