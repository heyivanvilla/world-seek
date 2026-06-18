// Curated emoji avatars. Each player picks one as their map marker + roster avatar.
// The image files live in public/emojis/ and are served at /emojis/<file>.
// This is the single source of truth shared by client (picker, rendering) and
// server (validation, default fallback) — add a line here for every file dropped
// into public/emojis/. Keep at least MAX_PLAYERS (12) entries so a full room can
// never run out of distinct avatars (emojis are unique per room).
//
// Assets are from OpenMoji (https://openmoji.org), licensed CC-BY-SA 4.0 — see the
// "License" section of the README. Swapping them is just a matter of dropping new
// files into public/emojis/ and editing the list below.

export interface EmojiDef {
  /** Stable id stored on the player + sent over the wire (never the raw filename). */
  id: string;
  /** Filename under public/emojis/. */
  file: string;
}

export const EMOJIS: EmojiDef[] = [
  { id: "grinning", file: "grinning.svg" },
  { id: "cool", file: "cool.svg" },
  { id: "nerd", file: "nerd.svg" },
  { id: "clown", file: "clown.svg" },
  { id: "mind-blown", file: "mind-blown.svg" },
  { id: "ghost", file: "ghost.svg" },
  { id: "robot", file: "robot.svg" },
  { id: "alien", file: "alien.svg" },
  { id: "dog", file: "dog.svg" },
  { id: "cat", file: "cat.svg" },
  { id: "fox", file: "fox.svg" },
  { id: "lion", file: "lion.svg" },
  { id: "frog", file: "frog.svg" },
  { id: "panda", file: "panda.svg" },
  { id: "penguin", file: "penguin.svg" },
  { id: "unicorn", file: "unicorn.svg" },
  { id: "dragon", file: "dragon.svg" },
  { id: "rocket", file: "rocket.svg" },
  { id: "fire", file: "fire.svg" },
  { id: "mushroom", file: "mushroom.svg" },
];

const BY_ID = new Map(EMOJIS.map((e) => [e.id, e]));

/** Fallback when a player has no (or an unknown) emoji. */
export const DEFAULT_EMOJI = EMOJIS[0].id;

export function isValidEmoji(id: string): boolean {
  return BY_ID.has(id);
}

/** Public URL for an emoji id; coerces unknown ids to the default. */
export function emojiUrl(id: string): string {
  const def = BY_ID.get(id) ?? BY_ID.get(DEFAULT_EMOJI)!;
  return `/emojis/${def.file}`;
}
