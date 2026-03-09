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

const SHAPES: { type: ShapeType; icon: string }[] = [
  { type: "rectangle", icon: "▭" },
  { type: "circle", icon: "◯" },
  { type: "diamond", icon: "◇" },
];

const btnBase: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: 6,
  color: "#9ca3af",
  padding: "5px 12px",
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  transition: "border-color 0.15s, color 0.15s",
};

export function Toolbar({
  connectFrom,
  selectedId,
  showAI,
  onAddShape,
  onToggleConnect,
  onDelete,
  onToggleAI,
  onExport,
}: ToolbarProps) {
  return (
    <div style={{
      height: 52, background: "#0a0f1a", borderBottom: "1px solid #1e3a2f",
      display: "flex", alignItems: "center", padding: "0 16px", gap: 8, zIndex: 10, flexShrink: 0,
    }}>
      {/* Logo */}
      <span style={{ color: "#10b981", fontWeight: 700, fontSize: 14, letterSpacing: 2, marginRight: 16 }}>
        ◈ DIAGRAMIX
      </span>

      {/* Shape buttons */}
      {SHAPES.map(({ type, icon }) => (
        <button
          key={type}
          onClick={() => onAddShape(type)}
          style={btnBase}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#10b981";
            (e.currentTarget as HTMLButtonElement).style.color = "#10b981";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#374151";
            (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
          }}
        >
          {icon} {type}
        </button>
      ))}

      <div style={{ width: 1, height: 24, background: "#1f2937", margin: "0 8px" }} />

      {/* Connect */}
      <button
        onClick={onToggleConnect}
        style={{
          ...btnBase,
          background: connectFrom ? "#064e3b" : "#111827",
          borderColor: connectFrom ? "#10b981" : "#374151",
          color: connectFrom ? "#10b981" : "#9ca3af",
        }}
      >
        ⟶ connect
      </button>

      {/* Delete */}
      {selectedId && (
        <button
          onClick={onDelete}
          style={{ ...btnBase, background: "#1c0a0a", borderColor: "#7f1d1d", color: "#f87171" }}
        >
          ✕ delete
        </button>
      )}

      {/* Right side */}
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button
          onClick={onToggleAI}
          style={{
            ...btnBase,
            background: showAI ? "#064e3b" : "#111827",
            borderColor: showAI ? "#10b981" : "#374151",
            color: showAI ? "#10b981" : "#9ca3af",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>✦</span> AI
        </button>

        <button
          onClick={onExport}
          style={{ ...btnBase, display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366f1";
            (e.currentTarget as HTMLButtonElement).style.color = "#818cf8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#374151";
            (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
          }}
        >
          ↓ .drawio
        </button>
      </div>
    </div>
  );
}
