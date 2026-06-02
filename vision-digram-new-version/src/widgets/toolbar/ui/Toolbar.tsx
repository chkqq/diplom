import type { CSSProperties } from "react";
import type { ShapeType } from "../../../shared/types/diagram";
import type { ConnectState } from "../../../features/connect-mode";
import { useTheme, useThemeStore } from "../../../shared/theme";
import type { VisionTheme } from "../../../shared/theme";

interface ToolbarProps {
  connectFrom: ConnectState;
  selectedId: string | null;
  showAI: boolean;
  pendingType: ShapeType | null;
  canUndo: boolean;
  canRedo: boolean;
  onAddShape: (type: ShapeType) => void;
  onToggleConnect: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleAI: () => void;
  onExport: () => void;
  onImport: () => void;
}

const SHAPES: { type: ShapeType; icon: string }[] = [
  { type: "rectangle", icon: "\u25AD" },
  { type: "circle", icon: "\u25EF" },
  { type: "diamond", icon: "\u25C7" },
  { type: "list", icon: "\u2630" },
  { type: "table", icon: "\u229E" },
];

const btn = (theme: VisionTheme, active = false, danger = false): CSSProperties => ({
  background: active ? theme.accentSoft : danger ? theme.dangerSoft : theme.shapeFill,
  border: `1px solid ${active ? theme.accent : danger ? theme.danger : theme.borderMuted}`,
  borderRadius: 6,
  color: active ? theme.accentText : danger ? theme.danger : theme.textMuted,
  padding: "5px 12px",
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  display: "flex",
  alignItems: "center",
  gap: 5,
  minHeight: 28,
  transition: "border-color 0.15s, color 0.15s, background-color 0.15s",
});

export function Toolbar({
  connectFrom, selectedId, showAI, pendingType,
  canUndo, canRedo,
  onAddShape, onToggleConnect, onDelete, onUndo, onRedo, onToggleAI, onExport, onImport,
}: ToolbarProps) {
  const theme = useTheme();
  const themeMode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleMode);

  const mutedButton = (enabled: boolean): CSSProperties => ({
    ...btn(theme),
    opacity: enabled ? 1 : 0.35,
    cursor: enabled ? "pointer" : "default",
  });

  return (
    <div style={{
      height: 52, background: theme.surface, borderBottom: `1px solid ${theme.border}`,
      display: "flex", alignItems: "center", padding: "0 16px", gap: 6,
      zIndex: 10, flexShrink: 0, overflowX: "auto",
    }}>
      <span style={{
        color: theme.accentText,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0,
        marginRight: 12,
        whiteSpace: "nowrap",
      }}>
        Vision-Diagram
      </span>

      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={mutedButton(canUndo)}
        title="Undo (Ctrl+Z)"
      >
        {"\u21B6"}
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        style={mutedButton(canRedo)}
        title="Redo (Ctrl+Shift+Z)"
      >
        {"\u21B7"}
      </button>

      <div style={{ width: 1, height: 24, background: theme.separator, margin: "0 4px" }} />
      {SHAPES.map(({ type, icon }) => {
        const isActive = pendingType === type;
        return (
          <button
            key={type}
            onClick={() => onAddShape(type)}
            style={btn(theme, isActive)}
            title={isActive ? `Click on canvas to place ${type} (Esc to cancel)` : `Place ${type}`}
            onMouseEnter={(e) => {
              if (!isActive) {
                const b = e.currentTarget;
                b.style.borderColor = theme.accent;
                b.style.color = theme.accentText;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                const b = e.currentTarget;
                b.style.borderColor = theme.borderMuted;
                b.style.color = theme.textMuted;
              }
            }}
          >
            {icon}
            {isActive && (
              <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>{"\u25CF"}</span>
            )}
          </button>
        );
      })}

      <div style={{ width: 1, height: 24, background: theme.separator, margin: "0 4px" }} />

      <button onClick={onToggleConnect} style={btn(theme, !!connectFrom)} title="Connect shapes">
        {"\u27F6"}
      </button>

      {selectedId && (
        <button onClick={onDelete} style={btn(theme, false, true)}>{"\u2715"} delete</button>
      )}

      {pendingType && (
        <span style={{
          fontSize: 10, color: theme.accentBright, fontFamily: "'JetBrains Mono', monospace",
          opacity: 0.8, marginLeft: 4,
        }}>
          click on canvas | Esc to cancel
        </span>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        <button
          onClick={toggleTheme}
          style={{ ...btn(theme, themeMode === "light"), minWidth: 38, justifyContent: "center" }}
          title={themeMode === "light" ? "Switch to dark theme" : "Switch to light theme"}
          aria-label={themeMode === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>{themeMode === "light" ? "\u2600" : "\u263E"}</span>
        </button>

        <button onClick={onToggleAI} style={btn(theme, showAI)} title="Open AI Assistant">
          <span style={{ fontSize: 14 }}>{"\u2726"}</span> AI
        </button>

        <button
          onClick={onImport}
          style={btn(theme)}
          onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor = theme.accent; b.style.color = theme.accentBright; }}
          onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor = theme.borderMuted; b.style.color = theme.textMuted; }}
          title="Open .drawio file"
        >
          {"\u2191"} .drawio
        </button>
        <button
          onClick={onExport}
          style={btn(theme)}
          onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor = theme.edgeSelected; b.style.color = theme.edgeSelected; }}
          onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor = theme.borderMuted; b.style.color = theme.textMuted; }}
          title="Save as .drawio"
        >
          {"\u2193"} .drawio
        </button>
      </div>
    </div>
  );
}
