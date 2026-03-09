import { useRef, useEffect } from "react";
import type { Shape, Edge } from "../../../shared/store/diagramStore";
import type { ConnectState } from "../../../features/connect-mode";
import type { ShapeType } from "../../../shared/types/diagram";
import { CELL, GRID_COLS, GRID_ROWS } from "../../../shared/config/grid";
import { snapToGrid } from "../../../shared/lib";
import { ShapeRenderer } from "../../../entities/shape";
import { EdgeEl } from "../../../entities/edge";

interface DiagramCanvasProps {
  shapes: Shape[];
  edges: Edge[];
  selectedId: string | null;
  connectFrom: ConnectState;
  pan: { x: number; y: number };
  zoom: number;
  onSelectShape: (id: string) => void;
  onMoveShape: (id: string, x: number, y: number) => void;
  onUpdateShape: (id: string, props: Partial<Omit<Shape, "id">>) => void;
  onResizeShape: (id: string, x: number, y: number, w: number, h: number) => void;
  onRotateShape: (id: string, rotation: number) => void;
  pendingType: ShapeType | null;
  onConnectPort: (id: string) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number, pan: { x: number; y: number }) => void;
  onCursorMove: (gridX: number, gridY: number) => void;
  onPlaceShape: (gridX: number, gridY: number) => void;
  onDeselect: () => void;
  onEditStart: (shapeId: string, anchor: { x: number; y: number }) => void;
  onEditEnd: () => void;
}

export function DiagramCanvas({
  shapes, edges, selectedId, connectFrom, pan, zoom, pendingType,
  onSelectShape, onMoveShape, onUpdateShape,
  onResizeShape, onRotateShape,
  onConnectPort, onPanChange, onZoomChange, onCursorMove, onPlaceShape, onDeselect,
  onEditStart, onEditEnd,
}: DiagramCanvasProps) {
  const svgRef    = useRef<SVGSVGElement>(null);
  const panDragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const dragRef   = useRef<{ id: string; offX: number; offY: number } | null>(null);

  // Stable refs for zoom/pan so the wheel handler doesn't need to re-attach
  const zoomRef       = useRef(zoom);
  const panRef        = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current  = pan;  }, [pan]);

  const SVG_W = GRID_COLS * CELL;
  const SVG_H = GRID_ROWS * CELL;

  // Non-passive wheel handler for Ctrl+scroll zoom
  useEffect(() => {
    const el = svgRef.current!;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect    = el.getBoundingClientRect();
      const factor  = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const curZoom = zoomRef.current;
      const curPan  = panRef.current;
      const newZoom = Math.max(0.2, Math.min(4, curZoom * factor));
      // Keep the point under the cursor fixed
      const relX    = e.clientX - rect.left;
      const relY    = e.clientY - rect.top;
      const svgPtX  = (relX - curPan.x) / curZoom;
      const svgPtY  = (relY - curPan.y) / curZoom;
      onZoomChange(newZoom, { x: relX - svgPtX * newZoom, y: relY - svgPtY * newZoom });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [onZoomChange]);

  // Convert client coords to SVG-space coords (accounts for pan + zoom)
  const toSvg = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left  - pan.x) / zoom,
      y: (clientY - rect.top   - pan.y) / zoom,
    };
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    // Placement mode: any click on the canvas places the shape
    if (pendingType) {
      e.stopPropagation();
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      onPlaceShape(
        Math.max(0, Math.floor(svgX / CELL)),
        Math.max(0, Math.floor(svgY / CELL)),
      );
      return;
    }
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.getAttribute("data-bg")) {
      panDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      onDeselect();
      onEditEnd();
    }
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    if (panDragRef.current.active) {
      onPanChange({
        x: panDragRef.current.panX + e.clientX - panDragRef.current.startX,
        y: panDragRef.current.panY + e.clientY - panDragRef.current.startY,
      });
    }
    if (dragRef.current) {
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      onMoveShape(
        dragRef.current.id,
        Math.max(0, snapToGrid(svgX - dragRef.current.offX)),
        Math.max(0, snapToGrid(svgY - dragRef.current.offY)),
      );
    }
    // Track cursor position in grid cells for shape spawning
    const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
    onCursorMove(
      Math.max(0, Math.floor(svgX / CELL)),
      Math.max(0, Math.floor(svgY / CELL)),
    );
  };

  const onSvgMouseUp = () => {
    panDragRef.current.active = false;
    dragRef.current = null;
  };

  const onShapeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // In placement mode clicks on shapes also place the new shape
    if (pendingType) {
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      onPlaceShape(Math.max(0, Math.floor(svgX / CELL)), Math.max(0, Math.floor(svgY / CELL)));
      return;
    }
    if (connectFrom) return;
    const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
    const shape = shapes.find((s) => s.id === id)!;
    dragRef.current = {
      id,
      offX: svgX - shape.x * CELL,
      offY: svgY - shape.y * CELL,
    };
    onSelectShape(id);
  };

  return (
    <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
      <svg
        ref={svgRef}
        width="100%" height="100%"
        style={{ display: "block", cursor: pendingType ? "crosshair" : panDragRef.current.active ? "grabbing" : "grab" }}
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

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <rect data-bg="true"
            x={-CELL * 4} y={-CELL * 4}
            width={SVG_W + CELL * 8} height={SVG_H + CELL * 8}
            fill="url(#grid)"
          />

          {edges.map((ed) => <EdgeEl key={ed.id} edge={ed} shapes={shapes} />)}

          {shapes.map((sh) => (
            <ShapeRenderer
              key={sh.id}
              shape={sh}
              selected={selectedId === sh.id}
              connecting={connectFrom === sh.id}
              svgRef={svgRef}
              pan={pan}
              zoom={zoom}
              onMouseDown={(e) => onShapeMouseDown(e, sh.id)}
              onConnectClick={(e) => { e.stopPropagation(); onConnectPort(sh.id); }}
              onUpdate={onUpdateShape}
              onResize={onResizeShape}
              onRotate={onRotateShape}
              onEditStart={onEditStart}
              onEditEnd={onEditEnd}
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

      {/* Zoom level indicator */}
      {zoom !== 1 && (
        <div style={{
          position: "absolute", bottom: 8, right: 12,
          color: "#4b5563", fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace", pointerEvents: "none",
        }}>
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
