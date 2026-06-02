import type { ReactNode } from "react";
import type { ArrowType } from "../../../shared/store/diagramStore";
import type { Shape } from "../../../shared/store/diagramStore";
import type { ConnectState } from "../../../features/connect-mode";
import type { ShapeType } from "../../../shared/types/diagram";
import { useTheme } from "../../../shared/theme";

const ARROW_LABELS: Record<ArrowType, string> = {
  line: "\u2014\u2014\u2014 line",
  filled: "\u2014\u2192 filled",
  empty: "\u2014\u25B7 empty",
  source: "\u2190\u2014 source",
  both: "\u2194 both",
};

const SHAPE_ICONS: Record<string, string> = {
  rectangle: "\u25AD",
  circle: "\u25EF",
  diamond: "\u25C7",
  list: "\u2630",
  table: "\u229E",
};

interface StatusBarProps {
  shapeCount: number;
  edgeCount: number;
  zoom: number;
  selectedId: string | null;
  selectedIds: string[];
  selectedShape?: Shape;
  selectedEdge?: { arrowType?: ArrowType };
  connectFrom: ConnectState;
  pendingType: ShapeType | null;
}

export function StatusBar({
  shapeCount, edgeCount, zoom,
  selectedId, selectedIds, selectedShape, selectedEdge,
  connectFrom, pendingType,
}: StatusBarProps) {
  const theme = useTheme();
  const multiCount = selectedIds.length;
  const isMulti = multiCount > 1;

  const sep = (
    <div style={{ width: 1, height: 14, background: theme.separator, margin: "0 10px", flexShrink: 0 }} />
  );

  let selNode: ReactNode;
  if (isMulti) {
    selNode = (
      <span style={{ color: theme.accentBright }}>
        {SHAPE_ICONS.rectangle} {multiCount} shapes selected
        <span style={{ color: theme.textGhost, marginLeft: 8 }}>| drag to move | Del to delete</span>
      </span>
    );
  } else if (selectedEdge) {
    selNode = (
      <span style={{ color: theme.edgeSelected }}>
        {"\u219D"} edge | {ARROW_LABELS[selectedEdge.arrowType ?? "filled"]}
        <span style={{ color: theme.textGhost, marginLeft: 8 }}>| click type below | Del to delete</span>
      </span>
    );
  } else if (selectedShape) {
    const icon = SHAPE_ICONS[selectedShape.type] ?? "\u25C0";
    selNode = (
      <span style={{ color: theme.accentBright }}>
        {icon} {selectedShape.type}
        <span style={{ color: theme.textSubtle, marginLeft: 6 }}>
          [{selectedShape.x}, {selectedShape.y}] {selectedShape.w}x{selectedShape.h}
        </span>
        <span style={{ color: theme.textGhost, marginLeft: 8 }}>| drag / resize / dblclick edit</span>
      </span>
    );
  } else if (selectedId) {
    selNode = <span style={{ color: theme.accentBright }}>{"\u25C0"} shape selected</span>;
  } else {
    selNode = <span style={{ color: theme.textGhost }}>no selection</span>;
  }

  let modeNode: ReactNode = null;
  if (pendingType) {
    modeNode = (
      <span style={{ color: theme.warning }}>
        {"\u2726"} place {pendingType}
        <span style={{ color: theme.textGhost, marginLeft: 6 }}>| click canvas | Esc cancel</span>
      </span>
    );
  } else if (connectFrom) {
    const ready = connectFrom !== "pick";
    modeNode = (
      <span style={{ color: theme.edgeSelected }}>
        {"\u27F6"} {ready ? "select target shape" : "select source shape"}
        <span style={{ color: theme.textGhost, marginLeft: 6 }}>| Esc cancel</span>
      </span>
    );
  }

  return (
    <div style={{
      height: 28, background: theme.surface, borderTop: `1px solid ${theme.border}`,
      display: "flex", alignItems: "center", padding: "0 16px",
      fontSize: 10, flexShrink: 0,
      fontFamily: "'JetBrains Mono', monospace",
      overflow: "hidden",
    }}>
      <span style={{ color: theme.textGhost, whiteSpace: "nowrap" }}>
        shapes&nbsp;<span style={{ color: theme.textSubtle }}>{shapeCount}</span>
      </span>
      <span style={{ color: theme.textGhost, marginLeft: 10, whiteSpace: "nowrap" }}>
        edges&nbsp;<span style={{ color: theme.textSubtle }}>{edgeCount}</span>
      </span>

      {sep}

      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {selNode}
      </div>

      {modeNode && (
        <>
          {sep}
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {modeNode}
          </div>
        </>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", flexShrink: 0 }}>
        {sep}
        <span style={{
          color: zoom !== 1 ? theme.accentBright : theme.textGhost,
          minWidth: 44, textAlign: "right",
        }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
}
