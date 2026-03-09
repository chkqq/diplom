import { useRef } from "react";
import type { Shape, Edge } from "../../../shared/store/diagramStore";
import type { ConnectState } from "../../../features/connect-mode";
import { CELL, GRID_COLS, GRID_ROWS } from "../../../shared/config/grid";
import { snapToGrid } from "../../../shared/lib";
import { ShapeEl } from "../../../entities/shape";
import { EdgeEl } from "../../../entities/edge";

interface DiagramCanvasProps {
  shapes: Shape[];
  edges: Edge[];
  selectedId: string | null;
  connectFrom: ConnectState;
  pan: { x: number; y: number };
  onSelectShape: (id: string) => void;
  onMoveShape: (id: string, x: number, y: number) => void;
  onLabelChange: (id: string, text: string) => void;
  onConnectPort: (id: string) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onDeselect: () => void;
}

export function DiagramCanvas({
  shapes, edges, selectedId, connectFrom, pan,
  onSelectShape, onMoveShape, onLabelChange,
  onConnectPort, onPanChange, onDeselect,
}: DiagramCanvasProps) {
  const svgRef  = useRef<SVGSVGElement>(null);
  const panRef  = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const SVG_W = GRID_COLS * CELL;
  const SVG_H = GRID_ROWS * CELL;

  const onSvgMouseDown = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.getAttribute("data-bg")) {
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      onDeselect();
    }
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    if (panRef.current.active) {
      onPanChange({
        x: panRef.current.panX + e.clientX - panRef.current.startX,
        y: panRef.current.panY + e.clientY - panRef.current.startY,
      });
    }
    if (dragRef.current) {
      const rect = svgRef.current!.getBoundingClientRect();
      const rawX = e.clientX - rect.left - pan.x - dragRef.current.offX;
      const rawY = e.clientY - rect.top  - pan.y - dragRef.current.offY;
      onMoveShape(dragRef.current.id, Math.max(0, snapToGrid(rawX)), Math.max(0, snapToGrid(rawY)));
    }
  };

  const onSvgMouseUp = () => {
    panRef.current.active = false;
    dragRef.current = null;
  };

  const onShapeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (connectFrom) return;
    const rect  = svgRef.current!.getBoundingClientRect();
    const shape = shapes.find((s) => s.id === id)!;
    dragRef.current = {
      id,
      offX: e.clientX - (shape.x * CELL + pan.x + rect.left),
      offY: e.clientY - (shape.y * CELL + pan.y + rect.top),
    };
    onSelectShape(id);
  };

  return (
    <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
      <svg
        ref={svgRef}
        width="100%" height="100%"
        style={{ display: "block", cursor: panRef.current.active ? "grabbing" : "grab" }}
        onMouseDown={onSvgMouseDown}
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgMouseUp}
        onMouseLeave={onSvgMouseUp}
      >
        <defs>
          <pattern id="smallGrid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="#0f2318" strokeWidth={0.8} />
          </pattern>
          <pattern id="grid" width={CELL * 4} height={CELL * 4} patternUnits="userSpaceOnUse">
            <rect width={CELL * 4} height={CELL * 4} fill="url(#smallGrid)" />
            <path d={`M ${CELL * 4} 0 L 0 0 0 ${CELL * 4}`} fill="none" stroke="#122a1e" strokeWidth={1.2} />
          </pattern>
          <marker id="arrow" markerWidth={10} markerHeight={7} refX={10} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y})`}>
          <rect
            data-bg="true"
            x={-CELL * 4} y={-CELL * 4}
            width={SVG_W + CELL * 8} height={SVG_H + CELL * 8}
            fill="url(#grid)"
          />

          {edges.map((ed) => <EdgeEl key={ed.id} edge={ed} shapes={shapes} />)}

          {shapes.map((sh) => (
            <ShapeEl
              key={sh.id}
              shape={sh}
              selected={selectedId === sh.id}
              connecting={connectFrom === sh.id}
              onMouseDown={(e) => onShapeMouseDown(e, sh.id)}
              onConnectClick={(e) => { e.stopPropagation(); onConnectPort(sh.id); }}
              onLabelChange={(text) => onLabelChange(sh.id, text)}
            />
          ))}
        </g>
      </svg>

      {shapes.length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", textAlign: "center",
          color: "#1f2937", pointerEvents: "none",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>◈</div>
          <div style={{ fontSize: 13, letterSpacing: 2 }}>ADD SHAPES OR USE AI TO GENERATE A DIAGRAM</div>
        </div>
      )}

      {connectFrom && connectFrom !== "pick" && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "#064e3b", border: "1px solid #10b981", borderRadius: 8,
          padding: "6px 16px", color: "#10b981", fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace", pointerEvents: "none",
        }}>
          Click the port (◯) on the target shape
        </div>
      )}
    </div>
  );
}
