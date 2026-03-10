import type { ShapeType } from "../../../shared/types/diagram";
import type { ConnectState } from "../../../features/connect-mode";

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
  { type: "rectangle", icon: "▭"    },
  { type: "circle",    icon: "◯"  },
  { type: "diamond",   icon: "◇" },
  { type: "list",      icon: "☰"    },
  { type: "table",     icon: "⊞"   },
];

const btn = (active = false, danger = false): React.CSSProperties => ({
  background: active ? "#064e3b" : danger ? "#1c0a0a" : "#111827",
  border: `1px solid ${active ? "#10b981" : danger ? "#7f1d1d" : "#374151"}`,
  borderRadius: 6,
  color: active ? "#10b981" : danger ? "#f87171" : "#9ca3af",
  padding: "5px 12px",
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  display: "flex",
  alignItems: "center",
  gap: 5,
  transition: "border-color 0.15s, color 0.15s",
});

export function Toolbar({
  connectFrom, selectedId, showAI, pendingType,
  canUndo, canRedo,
  onAddShape, onToggleConnect, onDelete, onUndo, onRedo, onToggleAI, onExport, onImport,
}: ToolbarProps) {
  return (
    <div style={{
      height: 52, background: "#0a0f1a", borderBottom: "1px solid #1e3a2f",
      display: "flex", alignItems: "center", padding: "0 16px", gap: 6,
      zIndex: 10, flexShrink: 0, overflowX: "auto",
    }}>
      {/* Logo */}
      <span style={{ color: "#10b981", fontWeight: 700, fontSize: 13, letterSpacing: 2, marginRight: 12, whiteSpace: "nowrap" }}>
        ◈ Vision-Diagram
      </span>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{ ...btn(), opacity: canUndo ? 1 : 0.35, cursor: canUndo ? "pointer" : "default" }}
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        style={{ ...btn(), opacity: canRedo ? 1 : 0.35, cursor: canRedo ? "pointer" : "default" }}
        title="Redo (Ctrl+Shift+Z)"
      >
        ↷
      </button>

      <div style={{ width: 1, height: 24, background: "#1f2937", margin: "0 4px" }} />
      {SHAPES.map(({ type, icon}) => {
        const isActive = pendingType === type;
        return (
          <button
            key={type}
            onClick={() => onAddShape(type)}
            style={btn(isActive)}
            title={isActive ? `Click on canvas to place ${type} (Esc to cancel)` : `Place ${type}`}
            onMouseEnter={(e) => {
              if (!isActive) {
                const b = e.currentTarget;
                b.style.borderColor = "#10b981";
                b.style.color = "#10b981";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                const b = e.currentTarget;
                b.style.borderColor = "#374151";
                b.style.color = "#9ca3af";
              }
            }}
          >
            {icon}
            {isActive && (
              <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>●</span>
            )}
          </button>
        );
      })}

      <div style={{ width: 1, height: 24, background: "#1f2937", margin: "0 4px" }} />



      <button onClick={onToggleConnect} style={btn(!!connectFrom)}>
        ⟶
      </button>

      {selectedId && (
        <button onClick={onDelete} style={btn(false, true)}>✕ delete</button>
      )}

      {/* Hint when in placement mode */}
      {pendingType && (
        <span style={{
          fontSize: 10, color: "#6ee7b7", fontFamily: "'JetBrains Mono', monospace",
          opacity: 0.8, marginLeft: 4,
        }}>
          click on canvas · Esc to cancel
        </span>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        <button onClick={onToggleAI} style={btn(showAI)} title="Open Ai Assistant">
          <span style={{ fontSize: 14 }}>✦</span> AI
        </button>

        <button
          onClick={onImport}
          style={btn()}
          onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor="#10b981"; b.style.color="#6ee7b7"; }}
          onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor="#374151"; b.style.color="#9ca3af"; }}
          title="Open .drawio file"
        >
          ↑ .drawio
        </button>
        <button
          onClick={onExport}
          style={btn()}
          onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor="#6366f1"; b.style.color="#818cf8"; }}
          onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor="#374151"; b.style.color="#9ca3af"; }}
          title="Save as .drawio"
        >
          ↓ .drawio
        </button>
      </div>
    </div>
  );
}
