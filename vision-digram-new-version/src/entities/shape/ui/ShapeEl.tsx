import { useState, useRef, useEffect } from "react";
import type { Shape } from "../../../shared/store/diagramStore";
import { CELL } from "../../../shared/config/grid";

interface ShapeElProps {
  shape: Shape;
  selected: boolean;
  connecting: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectClick: (e: React.MouseEvent) => void;
  onLabelChange: (text: string) => void;
}

export function ShapeEl({
  shape,
  selected,
  connecting,
  onMouseDown,
  onConnectClick,
  onLabelChange,
}: ShapeElProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shape.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(shape.text);
  }, [shape.text, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitEdit = () => {
    setEditing(false);
    onLabelChange(draft);
  };

  const px = shape.x * CELL;
  const py = shape.y * CELL;
  const pw = shape.w * CELL;
  const ph = shape.h * CELL;

  const fill   = selected ? "#1a2e2a" : "#111827";
  const stroke = selected ? "#6ee7b7" : "#374151";
  const accent = selected ? "#6ee7b7" : connecting ? "#fbbf24" : "#4ade80";

  const renderBody = () => {
    if (shape.type === "rectangle") {
      return <rect x={px} y={py} width={pw} height={ph} rx={6} fill={fill} stroke={stroke} strokeWidth={1.5} />;
    }
    if (shape.type === "circle") {
      return (
        <ellipse
          cx={px + pw / 2} cy={py + ph / 2}
          rx={pw / 2} ry={ph / 2}
          fill={fill} stroke={stroke} strokeWidth={1.5}
        />
      );
    }
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    return (
      <polygon
        points={`${cx},${py} ${px + pw},${cy} ${cx},${py + ph} ${px},${cy}`}
        fill={fill} stroke={stroke} strokeWidth={1.5}
      />
    );
  };

  return (
    <g
      style={{ cursor: editing ? "text" : "move" }}
      onMouseDown={(e) => { if (!editing) onMouseDown(e); }}
      onDoubleClick={(e) => { e.stopPropagation(); setDraft(shape.text); setEditing(true); }}
    >
      {renderBody()}

      {selected && (
        <rect
          x={px - 2} y={py - 2} width={pw + 4} height={ph + 4}
          rx={8} fill="none" stroke={accent} strokeWidth={2}
          strokeDasharray="4 3" opacity={0.6}
        />
      )}

      {editing ? (
        <foreignObject x={px + 6} y={py + ph / 2 - 14} width={pw - 12} height={28}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") { setEditing(false); setDraft(shape.text); }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "#0a1a14",
              border: "1px solid #10b981",
              borderRadius: 4,
              outline: "none",
              color: "#d1fae5",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: "center",
              padding: "2px 4px",
              boxSizing: "border-box",
            }}
          />
        </foreignObject>
      ) : (
        <text
          x={px + pw / 2} y={py + ph / 2 + 5}
          textAnchor="middle"
          fill="#d1fae5"
          fontSize={12}
          fontFamily="'JetBrains Mono', monospace"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {shape.text || ""}
        </text>
      )}

      <circle
        cx={px + pw} cy={py + ph / 2}
        r={6}
        fill={connecting ? "#fbbf24" : "#064e3b"}
        stroke={connecting ? "#fbbf24" : "#10b981"}
        strokeWidth={1.5}
        style={{ cursor: "crosshair" }}
        onClick={(e) => { e.stopPropagation(); onConnectClick(e); }}
      />
    </g>
  );
}
