import type { ShapeType } from "../../../shared/types/diagram";
import type { ConnectState } from "../../../features/connect-mode";

interface ToolbarProps {
  connectFrom: ConnectState;
  selectedId: string | null;
  showAI: boolean;
  onAddShape: (type: ShapeType) => void;
  onToggleConnect: () => void;
  onDelete: () => void;
  onToggleAI: () => void;
  onExport: () => void;
}

const SHAPES: { type: ShapeType; icon: string; label: string }[] = [
  { type: "rectangle", icon: "▭", label: "rect"    },
  { type: "circle",    icon: "◯", label: "circle"  },
  { type: "diamond",   icon: "◇", label: "diamond" },
  { type: "list",      icon: "☰", label: "list"    },
  { type: "table",     icon: "⊞", label: "table"   },
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
  connectFrom, selectedId, showAI,
  onAddShape, onToggleConnect, onDelete, onToggleAI, onExport,
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

      {SHAPES.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => onAddShape(type)}
          style={btn()}
          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor="#10b981"; b.style.color="#10b981"; }}
          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor="#374151"; b.style.color="#9ca3af"; }}
        >
          {icon} {label}
        </button>
      ))}

      <div style={{ width: 1, height: 24, background: "#1f2937", margin: "0 4px" }} />

      <button onClick={onToggleConnect} style={btn(!!connectFrom)}>
        ⟶ connect
      </button>

      {selectedId && (
        <button onClick={onDelete} style={btn(false, true)}>✕ delete</button>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        <button
          onClick={onToggleAI}
          style={btn(showAI)}
        >
          <span style={{ fontSize: 14 }}>✦</span> AI
        </button>

        <button
          onClick={onExport}
          style={btn()}
          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor="#6366f1"; b.style.color="#818cf8"; }}
          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor="#374151"; b.style.color="#9ca3af"; }}
        >
          ↓ .drawio
        </button>
      </div>
    </div>
  );
}
