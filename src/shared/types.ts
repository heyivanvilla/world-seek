// Shared types used by BOTH the Socket.IO server and the React client.

export type Phase = "lobby" | "hiding" | "finding" | "results" | "finished";

export interface Settings {
  /** Points awarded for a perfect guess. */
  maxPoints: number;
  /** Distance (km) controlling how fast the score decays. Larger = more forgiving. */
  scoreScaleKm: number;
  /** Number of rounds in a solo game (the game picks one location per round). */
  soloRounds: number;
}

export const DEFAULT_SETTINGS: Settings = {
  maxPoints: 5000,
  scoreScaleKm: 2000,
  soloRounds: 5,
};

/**
 * "multiplayer" = the classic hide & seek (players hide, others guess).
 * "solo" = the game picks a random location each round and the lone player guesses.
 */
export type GameMode = "solo" | "multiplayer";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface HidingSpot extends LatLng {
  /** Street View panorama id at this spot (broadcast to guessers instead of coords). */
  panoId: string;
}

export interface Guess extends LatLng {
  distanceKm: number;
  points: number;
}

// ---------------------------------------------------------------------------
// Server-internal model (never sent verbatim to clients).
// ---------------------------------------------------------------------------

export interface Player {
  id: string;
  name: string;
  emoji: string; // chosen avatar id (see src/shared/emojis.ts); unique per room
  sessionToken: string; // secret — never projected
  isGameMaster: boolean;
  connected: boolean;
  socketId: string | null; // live socket, for per-player emits
  hiding: HidingSpot | null; // secret until results
  hasHidden: boolean;
  guesses: Record<string, Guess>; // targetPlayerId -> this player's guess
  totalScore: number;
}

export interface Room {
  code: string;
  phase: Phase;
  mode: GameMode; // decided at game:start (solo when the host is alone)
  settings: Settings;
  gameMasterId: string;
  players: Player[];
  order: string[]; // shuffled player ids being guessed, one per round (multiplayer)
  currentRound: number; // index into order (multiplayer) or 0..soloRounds-1 (solo)
  targets: HidingSpot[]; // solo only: the system-picked location per round
}

// ---------------------------------------------------------------------------
// Public projection (what a given client actually receives).
// ---------------------------------------------------------------------------

export interface PublicPlayer {
  id: string;
  name: string;
  emoji: string;
  isGameMaster: boolean;
  connected: boolean;
  hasHidden: boolean;
  totalScore: number;
}

export interface CurrentTarget {
  id: string;
  name: string;
  emoji: string;
  panoId: string; // imagery only; coords never sent here
}

export interface PublicGuess extends LatLng {
  playerId: string;
  name: string;
  emoji: string;
  distanceKm: number;
  points: number;
}

export interface RoundResult {
  targetId: string;
  targetName: string;
  targetEmoji: string;
  real: LatLng; // revealed only in results
  guesses: PublicGuess[];
}

export interface PublicState {
  code: string;
  phase: Phase;
  solo: boolean; // true when this is a single-player game (system-picked locations)
  settings: Settings;
  gameMasterId: string;
  players: PublicPlayer[];

  youId: string;
  youEmoji: string; // viewer's own avatar — for their dropped pin
  youAreGameMaster: boolean;

  // hiding phase
  youHaveHidden: boolean;
  hiddenCount: number;
  expectedHiders: number;

  // finding phase
  currentRound: number;
  totalRounds: number;
  currentTarget: CurrentTarget | null; // null when you are the target
  youAreTarget: boolean;
  youHaveGuessed: boolean;
  guessedCount: number;
  expectedGuessers: number;

  // results phase
  result: RoundResult | null;
}

// ---------------------------------------------------------------------------
// Socket payloads
// ---------------------------------------------------------------------------

export interface CreateAck {
  code: string;
  sessionToken: string;
  playerId: string;
}

export type JoinError =
  | "not_found"
  | "in_progress"
  | "name_taken"
  | "emoji_taken"
  | "full";

export type JoinAck =
  | { ok: true; sessionToken: string; playerId: string }
  // takenEmojis included on emoji_taken so the picker can refresh its disabled set.
  | { ok: false; error: JoinError; takenEmojis?: string[] };

export type PeekAck =
  | { ok: true; takenEmojis: string[] }
  | { ok: false };

export type ReconnectAck =
  | { ok: true; playerId: string }
  | { ok: false; error: "not_found" | "bad_token" };

// Acknowledgement for fire-and-forget game actions (start/hide/guess/next/lobby).
// Lets the client tell a dropped or stale seat (`not_seated` — retriable after a
// reconnect) apart from a genuine refusal (`rejected` — wrong phase / not host).
export type ActionAck =
  | { ok: true }
  | { ok: false; reason: "not_seated" | "rejected" };
