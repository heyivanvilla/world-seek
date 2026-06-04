import type {
  CurrentTarget,
  PublicGuess,
  PublicPlayer,
  PublicState,
  RoundResult,
  Room,
} from "../shared/types";
import {
  connectedPlayers,
  currentTargetId,
  expectedGuessers,
  findPlayer,
} from "./transitions";

function publicPlayer(p: Room["players"][number]): PublicPlayer {
  return {
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    isGameMaster: p.isGameMaster,
    connected: p.connected,
    hasHidden: p.hasHidden,
    totalScore: p.totalScore,
  };
}

/**
 * Build the redacted view for a single recipient. Other players' hiding spots,
 * tokens, and (until results) guesses are never included.
 */
export function projectFor(room: Room, viewerId: string): PublicState {
  const viewer = findPlayer(room, viewerId);
  const targetId = currentTargetId(room);

  // Players sorted by score (stable enough for leaderboard rendering).
  const players = room.players
    .map(publicPlayer)
    .sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name));

  // --- finding-phase target (imagery only, no coords) ---
  let currentTarget: CurrentTarget | null = null;
  const youAreTarget = targetId != null && targetId === viewerId;
  if (room.phase === "finding" && targetId && !youAreTarget) {
    const target = findPlayer(room, targetId);
    if (target?.hiding) {
      currentTarget = {
        id: target.id,
        name: target.name,
        emoji: target.emoji,
        panoId: target.hiding.panoId,
      };
    }
  }

  // --- results reveal ---
  let result: RoundResult | null = null;
  if (room.phase === "results" && targetId) {
    const target = findPlayer(room, targetId);
    if (target?.hiding) {
      const guesses: PublicGuess[] = room.players
        .map((p) => {
          const g = p.guesses[targetId];
          if (!g) return null;
          return {
            playerId: p.id,
            name: p.name,
            emoji: p.emoji,
            lat: g.lat,
            lng: g.lng,
            distanceKm: g.distanceKm,
            points: g.points,
          } satisfies PublicGuess;
        })
        .filter((g): g is PublicGuess => g != null)
        .sort((a, b) => b.points - a.points);

      result = {
        targetId: target.id,
        targetName: target.name,
        targetEmoji: target.emoji,
        real: { lat: target.hiding.lat, lng: target.hiding.lng },
        guesses,
      };
    }
  }

  const connected = connectedPlayers(room);
  const expected = expectedGuessers(room);
  const guessedCount = targetId
    ? expected.filter((p) => p.guesses[targetId]).length
    : 0;

  return {
    code: room.code,
    phase: room.phase,
    settings: room.settings,
    gameMasterId: room.gameMasterId,
    players,

    youId: viewerId,
    youEmoji: viewer?.emoji ?? "",
    youAreGameMaster: !!viewer?.isGameMaster,

    youHaveHidden: !!viewer?.hasHidden,
    hiddenCount: connected.filter((p) => p.hasHidden).length,
    expectedHiders: connected.length,

    currentRound: room.currentRound,
    totalRounds: room.order.length,
    currentTarget,
    youAreTarget,
    youHaveGuessed: !!(targetId && viewer?.guesses[targetId]),
    guessedCount,
    expectedGuessers: expected.length,

    result,
  };
}
