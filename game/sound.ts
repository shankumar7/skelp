/** Sound effects. All clips are synthesised by scripts/make-sounds.py — no third-party samples. */
import { createAudioPlayer } from "expo-audio";

const SOURCES = {
  tap: require("../assets/sounds/tap.wav"),
  bid: require("../assets/sounds/bid.wav"),
  rival: require("../assets/sounds/rival.wav"),
  outbid: require("../assets/sounds/outbid.wav"),
  tick: require("../assets/sounds/tick.wav"),
  lot: require("../assets/sounds/lot.wav"),
  sold: require("../assets/sounds/sold.wav"),
  unsold: require("../assets/sounds/unsold.wav"),
  win: require("../assets/sounds/win.wav"),
};
export type SoundName = keyof typeof SOURCES;

let enabled = true;
const players: Partial<Record<SoundName, ReturnType<typeof createAudioPlayer>>> = {};

export const isSoundOn = () => enabled;
export function setSoundOn(on: boolean) { enabled = on; }

/** Play a clip. Never throws — a game must not break because audio is unavailable. */
export function play(name: SoundName, volume = 1) {
  if (!enabled) return;
  try {
    const p = (players[name] ??= createAudioPlayer(SOURCES[name]));
    p.volume = volume;
    Promise.resolve(p.seekTo(0)).then(() => p.play()).catch(() => {});
  } catch {}
}
