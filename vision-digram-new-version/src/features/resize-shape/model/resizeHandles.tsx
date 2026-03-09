import { CELL } from "../../../shared/config/grid";
import type { Shape } from "../../../shared/store/diagramStore";

export type ResizeHandle =
  | "n" | "s" | "e" | "w"
  | "ne" | "nw" | "se" | "sw";

interface ResizeHandlesProps {
  shape: Shape;
  onResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
}

const HANDLE_SIZE = 8;

export function ResizeHandles({ shape, onResizeStart }: ResizeHandlesProps) {
  const px = shape.x * CELL;
  const py = shape.y * CELL;
  const pw = shape.w * CELL;
  const ph = shape.h * CELL;

  const cx = px + pw / 2;
  const cy = py + ph / 2;

  const handles: { id: ResizeHandle; hx: number; hy: number; cursor: string }[] = [
    { id: "nw", hx: px,      hy: py,      cursor: "nw-resize" },
    { id: "n",  hx: cx,      hy: py,      cursor: "n-resize"  },
    { id: "ne", hx: px + pw, hy: py,      cursor: "ne-resize" },
    { id: "e",  hx: px + pw, hy: cy,      cursor: "e-resize"  },
    { id: "se", hx: px + pw, hy: py + ph, cursor: "se-resize" },
    { id: "s",  hx: cx,      hy: py + ph, cursor: "s-resize"  },
    { id: "sw", hx: px,      hy: py + ph, cursor: "sw-resize" },
    { id: "w",  hx: px,      hy: cy,      cursor: "w-resize"  },
  ];

  return (
    <>
      {handles.map((h) => (
        <rect
          key={h.id}
          x={h.hx - HANDLE_SIZE / 2}
          y={h.hy - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          rx={2}
          fill="#0f172a"
          stroke="#6ee7b7"
          strokeWidth={1.5}
          style={{ cursor: h.cursor }}
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, h.id); }}
        />
      ))}
    </>
  );
}
