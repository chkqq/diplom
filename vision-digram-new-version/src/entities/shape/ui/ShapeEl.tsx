import { useState } from "react";
import type { Shape } from "../../../shared/types/diagram";
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

  const px = shape.x * CELL;
  const py = shape.y * CELL;
  const pw = shape.w * CELL;
  const ph = shape.h * CELL;

  const accent = selected ? "#6ee7b7" : connecting ? "#fbbf24" : "#4ade80";
  const fill = selected ? "#1a2e2a" : "#111827";
  const stroke = selected ? "#6ee7b7" : "#374151";

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
    // diamond
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
    <g style={{ cursor: "move" }} onMouseDown={onMouseDown} onDoubleClick={() => setEditing(true)}>
      {renderBody()}

      {/* Selection glow */}
      {selected && (
        <rect
          x={px - 2} y={py - 2} width={pw + 4} height={ph + 4}
          rx={8} fill="none" stroke={accent} strokeWidth={2}
          strokeDasharray="4 3" opacity={0.6}
        />
      )}

      {/* Label */}
      {editing ? (
        <foreignObject x={px + 4} y={py + ph / 2 - 12} width={pw - 8} height={24}>
          <input
            autoFocus
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e5e7eb",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              width: "100%",
              textAlign: "center",
            }}
            defaultValue={shape.text}
            onBlur={(e) => { setEditing(false); onLabelChange(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditing(false);
                onLabelChange((e.target as HTMLInputElement).value);
              }
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
          {shape.text}
        </text>
      )}

      {/* Connect port — right side */}
      <circle
        cx={px + pw} cy={py + ph / 2}
        r={6}
        fill={connecting ? "#fbbf24" : "#064e3b"}
        stroke={connecting ? "#fbbf24" : "#10b981"}
        strokeWidth={1.5}
        style={{ cursor: "crosshair" }}
        onClick={onConnectClick}
      />
    </g>
  );
}
