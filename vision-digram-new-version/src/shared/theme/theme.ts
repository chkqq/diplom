import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light";

export interface VisionTheme {
  mode: ThemeMode;
  appBg: string;
  canvasBg: string;
  canvasGridSmall: string;
  canvasGridLarge: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderMuted: string;
  separator: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textGhost: string;
  accent: string;
  accentBright: string;
  accentSoft: string;
  accentSubtle: string;
  accentText: string;
  onAccentText: string;
  accentGlow: string;
  edge: string;
  edgeSelected: string;
  shapeFill: string;
  shapeFillSelected: string;
  shapeHeader: string;
  shapeText: string;
  shapeTextMuted: string;
  handleFill: string;
  inputBg: string;
  selectionFill: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  panelShadow: string;
}

export const LEGACY_DEFAULT_TEXT_COLOR = "#d1fae5";

export const themes: Record<ThemeMode, VisionTheme> = {
  dark: {
    mode: "dark",
    appBg: "#030712",
    canvasBg: "#030712",
    canvasGridSmall: "#0f2318",
    canvasGridLarge: "#122a1e",
    surface: "#0a0f1a",
    surfaceAlt: "#0f172a",
    surfaceRaised: "#1e293b",
    border: "#1e3a2f",
    borderMuted: "#374151",
    separator: "#1f2937",
    text: "#e5e7eb",
    textMuted: "#9ca3af",
    textSubtle: "#6b7280",
    textGhost: "#374151",
    accent: "#10b981",
    accentBright: "#6ee7b7",
    accentSoft: "#064e3b",
    accentSubtle: "#0f2a1e",
    accentText: "#10b981",
    onAccentText: "#ffffff",
    accentGlow: "#10b981",
    edge: "#10b981",
    edgeSelected: "#f59e0b",
    shapeFill: "#111827",
    shapeFillSelected: "#1a2e2a",
    shapeHeader: "#0f2a1e",
    shapeText: "#d1fae5",
    shapeTextMuted: "#9ca3af",
    handleFill: "#0f172a",
    inputBg: "#1e293b",
    selectionFill: "rgba(16,185,129,0.06)",
    warning: "#fbbf24",
    warningSoft: "#78350f",
    danger: "#f87171",
    dangerSoft: "#1c0a0a",
    panelShadow: "0 0 40px #00000088",
  },
  light: {
    mode: "light",
    appBg: "#ffffff",
    canvasBg: "#ffffff",
    canvasGridSmall: "#f5d0fe",
    canvasGridLarge: "#e879f9",
    surface: "#ffffff",
    surfaceAlt: "#fdf4ff",
    surfaceRaised: "#f8fafc",
    border: "#f0abfc",
    borderMuted: "#cbd5e1",
    separator: "#e2e8f0",
    text: "#172033",
    textMuted: "#475569",
    textSubtle: "#64748b",
    textGhost: "#94a3b8",
    accent: "#c026d3",
    accentBright: "#d946ef",
    accentSoft: "#fae8ff",
    accentSubtle: "#fdf4ff",
    accentText: "#86198f",
    onAccentText: "#ffffff",
    accentGlow: "#d946ef",
    edge: "#c026d3",
    edgeSelected: "#86198f",
    shapeFill: "#ffffff",
    shapeFillSelected: "#fae8ff",
    shapeHeader: "#fae8ff",
    shapeText: "#1f2937",
    shapeTextMuted: "#475569",
    handleFill: "#ffffff",
    inputBg: "#ffffff",
    selectionFill: "rgba(192,38,211,0.10)",
    warning: "#f59e0b",
    warningSoft: "#fffbeb",
    danger: "#dc2626",
    dangerSoft: "#fee2e2",
    panelShadow: "0 18px 48px rgba(15, 23, 42, 0.16)",
  },
};

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark",
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({ mode: state.mode === "dark" ? "light" : "dark" })),
    }),
    { name: "vision-diagram-theme" },
  ),
);

export function useTheme(): VisionTheme {
  const mode = useThemeStore((state) => state.mode);
  return themes[mode];
}

export function resolveThemeTextColor(color: string | undefined, theme: VisionTheme): string {
  return !color || color === LEGACY_DEFAULT_TEXT_COLOR ? theme.shapeText : color;
}
