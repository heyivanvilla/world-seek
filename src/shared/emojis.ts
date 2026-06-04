// Curated emoji avatars. Each player picks one as their map marker + roster avatar.
// The image files live in public/emojis/ and are served at /emojis/<file>.
// This is the single source of truth shared by client (picker, rendering) and
// server (validation, default fallback) — add a line here for every file dropped
// into public/emojis/. Keep at least MAX_PLAYERS (12) entries so a full room can
// never run out of distinct avatars (emojis are unique per room).

export interface EmojiDef {
  /** Stable id stored on the player + sent over the wire (never the raw filename). */
  id: string;
  /** Filename under public/emojis/. */
  file: string;
}

export const EMOJIS: EmojiDef[] = [
  { id: "02-dance", file: "02_dance.gif" },
  { id: "0cat", file: "0cat.gif" },
  { id: "17j9j", file: "17j9j.gif" },
  { id: "1-wtf-rickq", file: "1_wtf_rickq.gif" },
  { id: "200-character-meme-spoof", file: "200_character_meme_spoof.png" },
  { id: "60fps-parrot", file: "60fps_parrot.gif" },
  { id: "aaahhhh", file: "aaahhhh.gif" },
  { id: "aaw-yeah", file: "aaw_yeah.gif" },
  { id: "ac-cowgirlq", file: "ac_cowgirlq.png" },
  { id: "acarl-runq", file: "acarl_runq.gif" },
  { id: "aceventura-dance", file: "aceventura_dance.gif" },
  { id: "ado-happy", file: "ado_happy.webp" },
  { id: "aggretsuko-rage", file: "aggretsuko-rage.gif" },
  { id: "charmander-dancing", file: "charmander_dancing.gif" },
  { id: "doge-finger-guns-back", file: "doge_finger_guns_back.png" },
  { id: "dumpster-fire", file: "dumpster-fire.gif" },
  { id: "gif4q", file: "gif4q.gif" },
  { id: "gif-bunny-sadq", file: "gif_bunny_sadq.gif" },
  { id: "hyper", file: "hyper.gif" },
  { id: "luigi-dance", file: "luigi_dance.gif" },
  { id: "mario", file: "mario.gif" },
  { id: "narutorun", file: "narutorun.gif" },
  { id: "smart", file: "smart.gif" },
  { id: "snorlax", file: "snorlax.png" },
  { id: "snorlaxrun", file: "snorlaxrun.gif" },
  { id: "squirtle-jammin", file: "squirtle_jammin.gif" },
  { id: "surprised-pikachu", file: "surprised-pikachu.png" },
  { id: "thisisfine", file: "thisisfine.gif" },
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
