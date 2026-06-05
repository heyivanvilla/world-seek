import {
  DEFAULT_SETTINGS,
  type HidingSpot,
  type LatLng,
  type Player,
  type Room,
  type Settings,
} from "../shared/types";
import { computeScore, haversineKm } from "../shared/scoring";
import { generatePlayerId, generateRoomCode, generateToken } from "../shared/codes";
import { DEFAULT_EMOJI, isValidEmoji } from "../shared/emojis";

const MAX_PLAYERS = 12;

export function createRoom(
  gmName: string,
  settings?: Partial<Settings>,
  gmEmoji?: string,
): {
  room: Room;
  player: Player;
} {
  const player = newPlayer(gmName, true, gmEmoji);
  const room: Room = {
    code: generateRoomCode(),
    phase: "lobby",
    settings: { ...DEFAULT_SETTINGS, ...settings },
    gameMasterId: player.id,
    players: [player],
    order: [],
    currentRound: 0,
  };
  return { room, player };
}

function newPlayer(name: string, isGameMaster: boolean, emoji?: string): Player {
  return {
    id: generatePlayerId(),
    name: name.trim().slice(0, 24) || "Player",
    // Coerce unknown/missing ids to the default so a client can't inject an
    // arbitrary image path; uniqueness is enforced separately in addPlayer.
    emoji: emoji && isValidEmoji(emoji) ? emoji : DEFAULT_EMOJI,
    sessionToken: generateToken(),
    isGameMaster,
    connected: true,
    socketId: null,
    hiding: null,
    hasHidden: false,
    guesses: {},
    livePin: null,
    totalScore: 0,
  };
}

/** Emoji ids already claimed by players in this room (for picker + conflicts). */
export function takenEmojis(room: Room): string[] {
  return room.players.map((p) => p.emoji);
}

export type AddResult =
  | { ok: true; player: Player }
  | { ok: false; error: "in_progress" | "name_taken" | "emoji_taken" | "full" };

export function addPlayer(room: Room, name: string, emoji?: string): AddResult {
  if (room.phase !== "lobby") return { ok: false, error: "in_progress" };
  if (room.players.length >= MAX_PLAYERS) return { ok: false, error: "full" };
  const trimmed = name.trim().slice(0, 24);
  if (
    room.players.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return { ok: false, error: "name_taken" };
  }
  const resolved = emoji && isValidEmoji(emoji) ? emoji : DEFAULT_EMOJI;
  if (room.players.some((p) => p.emoji === resolved)) {
    return { ok: false, error: "emoji_taken" };
  }
  const player = newPlayer(trimmed, false, resolved);
  room.players.push(player);
  return { ok: true, player };
}

export function findPlayer(room: Room, playerId: string): Player | undefined {
  return room.players.find((p) => p.id === playerId);
}

export function findByToken(room: Room, token: string): Player | undefined {
  return room.players.find((p) => p.sessionToken === token);
}

export function connectedPlayers(room: Room): Player[] {
  return room.players.filter((p) => p.connected);
}

// --- lobby -> hiding -------------------------------------------------------

export function startGame(room: Room): boolean {
  if (room.phase !== "lobby") return false;
  if (connectedPlayers(room).length < 2) return false;
  room.phase = "hiding";
  for (const p of room.players) {
    p.hiding = null;
    p.hasHidden = false;
    p.guesses = {};
    p.livePin = null;
    p.totalScore = 0;
  }
  return true;
}

// --- hiding ----------------------------------------------------------------

export function recordHide(room: Room, playerId: string, spot: HidingSpot): boolean {
  if (room.phase !== "hiding") return false;
  const p = findPlayer(room, playerId);
  if (!p) return false;
  p.hiding = spot;
  p.hasHidden = true;
  return true;
}

export function allConnectedHidden(room: Room): boolean {
  const connected = connectedPlayers(room);
  return connected.length >= 2 && connected.every((p) => p.hasHidden);
}

/** Build the shuffled round order from everyone who has a hiding spot. */
export function startFinding(room: Room): boolean {
  const hidden = room.players.filter((p) => p.hasHidden && p.hiding);
  if (hidden.length < 2) return false;
  room.order = shuffle(hidden.map((p) => p.id));
  room.currentRound = 0;
  room.phase = "finding";
  return true;
}

// --- finding ---------------------------------------------------------------

export function currentTargetId(room: Room): string | null {
  if (room.phase !== "finding" && room.phase !== "results") return null;
  return room.order[room.currentRound] ?? null;
}

export function recordGuess(room: Room, guesserId: string, at: LatLng): boolean {
  if (room.phase !== "finding") return false;
  const targetId = currentTargetId(room);
  if (!targetId || guesserId === targetId) return false;
  const guesser = findPlayer(room, guesserId);
  const target = findPlayer(room, targetId);
  if (!guesser || !target || !target.hiding) return false;

  const distanceKm = haversineKm(at, target.hiding);
  const points = computeScore(distanceKm, room.settings);
  guesser.guesses[targetId] = { ...at, distanceKm, points };
  // The tentative pin has become a solid guess — drop it so watchers see one pin.
  guesser.livePin = null;
  return true;
}

/**
 * Record a guesser's in-progress (un-confirmed) pin for the current round so it
 * can be streamed to watchers. Mirrors recordGuess's guards but scores nothing.
 */
export function recordLivePin(room: Room, guesserId: string, at: LatLng): boolean {
  if (room.phase !== "finding") return false;
  const targetId = currentTargetId(room);
  if (!targetId || guesserId === targetId) return false;
  const guesser = findPlayer(room, guesserId);
  const target = findPlayer(room, targetId);
  if (!guesser || !target || !target.hiding) return false;
  // Ignore once they've locked in — their solid guess already represents them.
  if (guesser.guesses[targetId]) return false;
  guesser.livePin = { targetId, lat: at.lat, lng: at.lng };
  return true;
}

export function expectedGuessers(room: Room): Player[] {
  const targetId = currentTargetId(room);
  const orderSet = new Set(room.order);
  return room.players.filter(
    (p) => p.connected && orderSet.has(p.id) && p.id !== targetId,
  );
}

export function allGuessed(room: Room): boolean {
  const targetId = currentTargetId(room);
  if (!targetId) return false;
  const expected = expectedGuessers(room);
  if (expected.length === 0) return false;
  return expected.every((p) => p.guesses[targetId]);
}

/** Tally the current round's points into totals and move to results. */
export function scoreRound(room: Room): boolean {
  if (room.phase !== "finding") return false;
  const targetId = currentTargetId(room);
  if (!targetId) return false;
  for (const p of room.players) {
    const g = p.guesses[targetId];
    if (g) p.totalScore += g.points;
  }
  room.phase = "results";
  return true;
}

// --- results -> next / finished -------------------------------------------

export function nextRound(room: Room): boolean {
  if (room.phase !== "results") return false;
  if (room.currentRound + 1 >= room.order.length) {
    room.phase = "finished";
  } else {
    room.currentRound += 1;
    room.phase = "finding";
  }
  return true;
}

export function returnToLobby(room: Room): boolean {
  room.phase = "lobby";
  room.order = [];
  room.currentRound = 0;
  for (const p of room.players) {
    p.hiding = null;
    p.hasHidden = false;
    p.guesses = {};
    p.livePin = null;
    p.totalScore = 0;
  }
  return true;
}

// --- helpers ---------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
