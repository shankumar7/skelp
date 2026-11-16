/**
 * Light and dark palettes for the clay look.
 *  - `T` is the active palette: read `T.ink`, `T.card`… while rendering.
 *  - `themed(() => StyleSheet.create({...}))` builds a stylesheet lazily, once per theme.
 * Switching theme remounts the app (see app/_layout.tsx), so every screen re-reads both.
 */
export type ThemeName = "light" | "dark";

const LIGHT = {
  name: "light" as ThemeName,
  bg: "#FAF7F2", bgAlt: "#FBF8F3", sand: "#F2EDE4", card: "#FFFFFF", cardEdge: "#FFFFFF",
  line: "#ECE4D8", lineStrong: "#D2C8B9",
  ink: "#231F3D", ink2: "#3A3560", sub: "#585279", muted: "#77718F", dim: "#A29CB6",
  primary: "#5B5FEF", primaryText: "#5458E8", primarySoft: "#EEEDFF",
  mintSoft: "#DDF7EF", mintText: "#12806A", goldSoft: "#FFF2D9", goldText: "#B9760A", coralSoft: "#FFE7E7", coralText: "#D94444",
  white: "#FFF",
  /** text and tints that sit on a primary-coloured surface: the same in both themes */
  onPrimary: "#FFFFFF", onPrimarySoft: "#E6E4FF", onPrimaryDim: "#C9C6FF",
  mint: "#2EC4A0", gold: "#FFB238", coral: "#FF6B6B",
  gradPrimary: ["#7074FF", "#4A4DDB"] as [string, string],
  gradHero: ["#6E6BFF", "#4B49DC", "#3A36B8"] as [string, string, string],
  gradMint: ["#3AD4AE", "#1FA587"] as [string, string],
  gradGold: ["#FFC65C", "#F59E1B"] as [string, string],
  gradOff: ["#CFCADB", "#A9A3BA"] as [string, string],
  gradBg: ["#F6F3FF", "#FAF7F2", "#FFF6EA"] as [string, string, string],
  glowA: "rgba(108, 99, 255, 0.10)", glowB: "rgba(255, 178, 56, 0.10)", glowC: "rgba(46, 196, 160, 0.08)",
  barBg: "rgba(255, 255, 255, 0.96)",
  scrim: "rgba(35, 31, 61, 0.45)",
  clayCard: "0px 14px 28px rgba(60, 50, 110, 0.10), inset 0px -6px 12px rgba(60, 50, 110, 0.06), inset 0px 6px 10px rgba(255, 255, 255, 0.95)",
  claySoft: "0px 6px 14px rgba(60, 50, 110, 0.08), inset 0px -4px 7px rgba(60, 50, 110, 0.05), inset 0px 4px 7px rgba(255, 255, 255, 0.95)",
  clayPocket: "inset 0px 4px 8px rgba(60, 50, 110, 0.12), inset 0px -3px 6px rgba(255, 255, 255, 0.95)",
  clayPrimary: "0px 14px 26px rgba(91, 95, 239, 0.36), inset 0px -8px 12px rgba(40, 40, 150, 0.38), inset 0px 8px 12px rgba(255, 255, 255, 0.36)",
  clayMint: "0px 14px 26px rgba(46, 196, 160, 0.36), inset 0px -8px 12px rgba(10, 110, 85, 0.38), inset 0px 8px 12px rgba(255, 255, 255, 0.40)",
  clayHeader: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 5, boxShadow: "0px 10px 22px rgba(60, 50, 110, 0.09), inset 0px -6px 10px rgba(60, 50, 110, 0.04)" },
};
export type Palette = typeof LIGHT;

const DARK: Palette = {
  name: "dark",
  bg: "#12101F", bgAlt: "#141224", sand: "#1B182E", card: "#221F38", cardEdge: "#2D2949",
  line: "#312C4E", lineStrong: "#443E69",
  ink: "#F4F2FC", ink2: "#DDD9EE", sub: "#BDB8D4", muted: "#A39EBD", dim: "#8680A3",
  primary: "#6A6EFF", primaryText: "#A9ACFF", primarySoft: "#2C2A57",
  mintSoft: "#14382F", mintText: "#62E3C4", goldSoft: "#3B2F14", goldText: "#FFC766", coralSoft: "#40202A", coralText: "#FF8F8F",
  white: "#FFF",
  onPrimary: "#FFFFFF", onPrimarySoft: "#E6E4FF", onPrimaryDim: "#C9C6FF",
  mint: "#2EC4A0", gold: "#FFB238", coral: "#FF6B6B",
  gradPrimary: ["#7074FF", "#4A4DDB"],
  gradHero: ["#6360F0", "#4441C8", "#2F2C99"],
  gradMint: ["#34CCA7", "#1B987C"],
  gradGold: ["#FFC65C", "#F59E1B"],
  gradOff: ["#4A4567", "#37324F"],
  gradBg: ["#17142B", "#12101F", "#161224"],
  glowA: "rgba(108, 99, 255, 0.16)", glowB: "rgba(255, 178, 56, 0.06)", glowC: "rgba(46, 196, 160, 0.07)",
  barBg: "rgba(24, 21, 42, 0.97)",
  scrim: "rgba(5, 4, 12, 0.65)",
  clayCard: "0px 14px 28px rgba(0, 0, 0, 0.42), inset 0px -6px 12px rgba(0, 0, 0, 0.28), inset 0px 6px 10px rgba(255, 255, 255, 0.06)",
  claySoft: "0px 6px 14px rgba(0, 0, 0, 0.36), inset 0px -4px 7px rgba(0, 0, 0, 0.26), inset 0px 4px 7px rgba(255, 255, 255, 0.06)",
  clayPocket: "inset 0px 4px 8px rgba(0, 0, 0, 0.50), inset 0px -3px 6px rgba(255, 255, 255, 0.05)",
  clayPrimary: "0px 14px 26px rgba(90, 94, 255, 0.30), inset 0px -8px 12px rgba(30, 30, 120, 0.45), inset 0px 8px 12px rgba(255, 255, 255, 0.28)",
  clayMint: "0px 14px 26px rgba(46, 196, 160, 0.26), inset 0px -8px 12px rgba(10, 110, 85, 0.45), inset 0px 8px 12px rgba(255, 255, 255, 0.30)",
  clayHeader: { backgroundColor: "#221F38", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 5, boxShadow: "0px 10px 22px rgba(0, 0, 0, 0.45), inset 0px -6px 10px rgba(0, 0, 0, 0.25)" },
};

const PALETTES: Record<ThemeName, Palette> = { light: LIGHT, dark: DARK };
let current: ThemeName = "light";

export const getTheme = () => current;
export function setTheme(name: ThemeName) {
  current = name === "dark" ? "dark" : "light";
}

/** The active palette. */
export const T: Palette = new Proxy({} as Palette, { get: (_, key) => (PALETTES[current] as any)[key] });

/** A stylesheet that follows the theme: built on first use, cached per theme. */
export function themed<S extends object>(factory: () => S): S {
  const cache: Partial<Record<ThemeName, S>> = {};
  return new Proxy({} as S, { get: (_, key) => ((cache[current] ??= factory()) as any)[key] });
}
