const LS_ENABLED_KEY = "ws-sfx-enabled";
const LS_VOLUME_KEY = "ws-sfx-volume";
const DEFAULT_VOLUME = 0.2;

export interface SfxSettings {
  enabled: boolean;
  volume: number; // 0..1
}

export function isSfxEnabled(): boolean {
  try {
    return localStorage.getItem(LS_ENABLED_KEY) !== "off";
  } catch {
    return true;
  }
}

export function getSfxVolume(): number {
  try {
    const raw = parseFloat(localStorage.getItem(LS_VOLUME_KEY) ?? "");
    return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function getSfxSettings(): SfxSettings {
  return { enabled: isSfxEnabled(), volume: getSfxVolume() };
}

export function setSfxEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LS_ENABLED_KEY, enabled ? "on" : "off");
  } catch {}
}

export function setSfxVolume(volume: number): void {
  const clamped = Math.min(1, Math.max(0, volume));
  try {
    localStorage.setItem(LS_VOLUME_KEY, String(clamped));
  } catch {}
}

// One shared <audio> element per sound effect, reused across plays instead of
// allocating a new one each time.
const audioCache = new Map<string, HTMLAudioElement>();

/** Plays a sound effect from /public, respecting the enabled + volume settings. */
export function playSfx(src: string): void {
  if (!isSfxEnabled()) return;
  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audioCache.set(src, audio);
  }
  audio.currentTime = 0;
  audio.volume = getSfxVolume();
  audio.play().catch(() => {});
}
