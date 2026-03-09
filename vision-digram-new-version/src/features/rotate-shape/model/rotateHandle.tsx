import { CELL } from "../../../shared/config/grid";
import type { Shape } from "../../../shared/store/diagramStore";

interface RotateHandleProps {
  shape: Shape;
  onRotateStart: (e: React.MouseEvent) => void;
}

export function RotateHandle({ shape, onRotateStart }: RotateHandleProps) {
  const px = shape.x * CELL;
  const py = shape.y * CELL;
  const pw = shape.w * CELL;
  const cx = px + pw / 2;
  const topY = py - 24;

  return (
    <g>
      {/* Line from shape to handle */}
      <line
        x1={cx} y1={py - 2}
        x2={cx} y2={topY + 6}
        stroke="#6ee7b7" strokeWidth={1} strokeDasharray="3 2" opacity={0.6}
      />
      {/* Rotate circle */}
      <circle
        cx={cx} cy={topY}
        r={7}
        fill="#0f172a"
        stroke="#6ee7b7"
        strokeWidth={1.5}
        style={{ cursor: "grab" }}
        onMouseDown={(e) => { e.stopPropagation(); onRotateStart(e); }}
      />
      {/* Rotation icon hint */}
      <text
        x={cx} y={topY + 4}
        textAnchor="middle"
        fontSize={9}
        fill="#6ee7b7"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >↻</text>
    </g>
  );
}
