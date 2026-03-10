import type { ArrowType } from "../../../shared/store/diagramStore";
import type { Shape } from "../../../shared/store/diagramStore";
import type { ConnectState } from "../../../features/connect-mode";
import type { ShapeType } from "../../../shared/types/diagram";

const ARROW_LABELS: Record<ArrowType, string> = {
  line:   "——— line",
  filled: "—→ filled",
  empty:  "—▷ empty",
  source: "←— source",
  both:   "↔ both",
};

const SHAPE_ICONS: Record<string, string> = {
  rectangle: "▭",
  circle:    "◯",
  diamond:   "◇",
  list:      "☰",
  table:     "⊞",
};

interface StatusBarProps {
  shapeCount:    number;
  edgeCount:     number;
  zoom:          number;
  selectedId:    string | null;
  selectedIds:   string[];
  selectedShape?: Shape;
  selectedEdge?: { arrowType?: ArrowType };
  connectFrom:   ConnectState;
  pendingType:   ShapeType | null;
}

const sep = (
  <div style={{ width: 1, height: 14, background: "#1f2937", margin: "0 10px", flexShrink: 0 }} />
);

export function StatusBar({
  shapeCount, edgeCount, zoom,
  selectedId, selectedIds, selectedShape, selectedEdge,
  connectFrom, pendingType,
}: StatusBarProps) {
  const multiCount = selectedIds.length;
  const isMulti    = multiCount > 1;

  /* ── selection label ── */
  let selNode: React.ReactNode;
  if (isMulti) {
    selNode = (
      <span style={{ color: "#6ee7b7" }}>
        {SHAPE_ICONS["rectangle"]} {multiCount} shapes selected
        <span style={{ color: "#374151", marginLeft: 8 }}>· drag to move · Del to delete</span>
      </span>
    );
  } else if (selectedEdge) {
    selNode = (
      <span style={{ color: "#818cf8" }}>
        ↝ edge · {ARROW_LABELS[selectedEdge.arrowType ?? "filled"]}
        <span style={{ color: "#374151", marginLeft: 8 }}>· click type below · Del to delete</span>
      </span>
    );
  } else if (selectedShape) {
    const icon = SHAPE_ICONS[selectedShape.type] ?? "◈";
    selNode = (
      <span style={{ color: "#6ee7b7" }}>
        {icon} {selectedShape.type}
        <span style={{ color: "#4b5563", marginLeft: 6 }}>
          [{selectedShape.x}, {selectedShape.y}] {selectedShape.w}×{selectedShape.h}
        </span>
        <span style={{ color: "#374151", marginLeft: 8 }}>· drag / resize / dblclick edit</span>
      </span>
    );
  } else if (selectedId) {
    selNode = (
      <span style={{ color: "#6ee7b7" }}>◈ shape selected</span>
    );
  } else {
    selNode = <span style={{ color: "#1f2937" }}>no selection</span>;
  }

  /* ── mode label ── */
  let modeNode: React.ReactNode = null;
  if (pendingType) {
    modeNode = (
      <span style={{ color: "#fbbf24" }}>
        ✦ place {pendingType}
        <span style={{ color: "#374151", marginLeft: 6 }}>· click canvas · Esc cancel</span>
      </span>
    );
  } else if (connectFrom) {
    const ready = connectFrom !== "pick";
    modeNode = (
      <span style={{ color: "#f59e0b" }}>
        ⟶ {ready ? "select target shape" : "select source shape"}
        <span style={{ color: "#374151", marginLeft: 6 }}>· Esc cancel</span>
      </span>
    );
  }


  return (
    <div style={{
      height: 28, background: "#0a0f1a", borderTop: "1px solid #1e3a2f",
      display: "flex", alignItems: "center", padding: "0 16px",
      fontSize: 10, flexShrink: 0,
      fontFamily: "'JetBrains Mono', monospace",
      overflow: "hidden",
    }}>
      {/* counts */}
      <span style={{ color: "#374151", whiteSpace: "nowrap" }}>
        shapes&nbsp;<span style={{ color: "#4b5563" }}>{shapeCount}</span>
      </span>
      <span style={{ color: "#374151", marginLeft: 10, whiteSpace: "nowrap" }}>
        edges&nbsp;<span style={{ color: "#4b5563" }}>{edgeCount}</span>
      </span>

      {sep}

      {/* selection info */}
      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {selNode}
      </div>

      {sep}

      {/* mode */}
      {modeNode && (
        <>
          {sep}
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {modeNode}
          </div>
        </>
      )}

      {/* zoom */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", flexShrink: 0 }}>
        {sep}
        <span style={{
          color: zoom !== 1 ? "#6ee7b7" : "#374151",
          minWidth: 44, textAlign: "right",
        }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
}
