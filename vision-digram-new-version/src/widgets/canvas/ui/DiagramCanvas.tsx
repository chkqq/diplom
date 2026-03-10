import { useRef, useEffect, useState } from "react";
import type { Shape, Edge, ArrowType } from "../../../shared/store/diagramStore";
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
  selectedIds: string[];
  selectedEdgeId: string | null;
  connectFrom: ConnectState;
  pan: { x: number; y: number };
  zoom: number;
  pendingType: ShapeType | null;
  onSelectShape: (id: string) => void;
  onSelectMultiple: (ids: string[]) => void;
  onSelectEdge: (id: string) => void;
  onMoveShape: (id: string, x: number, y: number) => void;
  onMoveMultiple: (updates: { id: string; x: number; y: number }[]) => void;
  onUpdateShape: (id: string, props: Partial<Omit<Shape, "id">>) => void;
  onResizeShape: (id: string, x: number, y: number, w: number, h: number) => void;
  onRotateShape: (id: string, rotation: number) => void;
  onConnectPort: (id: string) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number, pan: { x: number; y: number }) => void;
  onCursorMove: (gridX: number, gridY: number) => void;
  onPlaceShape: (gridX: number, gridY: number) => void;
  onDeselect: () => void;
  onEditStart: (shapeId: string, anchor: { x: number; y: number }) => void;
  onEditEnd: () => void;
  onUpdateEdge: (id: string, props: { arrowType: ArrowType }) => void;
}

export function DiagramCanvas({
  shapes, edges, selectedId, selectedIds, selectedEdgeId, connectFrom, pan, zoom, pendingType,
  onSelectShape, onSelectMultiple, onSelectEdge,
  onMoveShape, onMoveMultiple, onUpdateShape,
  onResizeShape, onRotateShape,
  onConnectPort, onPanChange, onZoomChange, onCursorMove, onPlaceShape, onDeselect,
  onEditStart, onEditEnd, onUpdateEdge,
}: DiagramCanvasProps) {
  const svgRef      = useRef<SVGSVGElement>(null);
  const panDragRef  = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const dragRef     = useRef<{ id: string; offX: number; offY: number } | null>(null);
  const multiDragRef = useRef<{ items: { id: string; offX: number; offY: number }[] } | null>(null);
  const selStartRef = useRef<{ svgX: number; svgY: number } | null>(null);
  const [selBox, setSelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const zoomRef = useRef(zoom);
  const panRef  = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current  = pan;  }, [pan]);

  const SVG_W = GRID_COLS * CELL;
  const SVG_H = GRID_ROWS * CELL;

  // Non-passive wheel for Ctrl+scroll zoom
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
      const relX    = e.clientX - rect.left;
      const relY    = e.clientY - rect.top;
      const svgPtX  = (relX - curPan.x) / curZoom;
      const svgPtY  = (relY - curPan.y) / curZoom;
      onZoomChange(newZoom, { x: relX - svgPtX * newZoom, y: relY - svgPtY * newZoom });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [onZoomChange]);

  const toSvg = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    };
  };

  const isBackground = (target: SVGElement) =>
    target === svgRef.current || !!target.getAttribute("data-bg");

  const onSvgMouseDown = (e: React.MouseEvent) => {
    // Placement mode: any click places shape
    if (pendingType) {
      e.stopPropagation();
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      onPlaceShape(Math.max(0, Math.floor(svgX / CELL)), Math.max(0, Math.floor(svgY / CELL)));
      return;
    }

    // RMB → pan
    if (e.button === 2 && isBackground(e.target as SVGElement)) {
      panDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }

    // LMB on background → rubber-band selection
    if (e.button === 0 && isBackground(e.target as SVGElement)) {
      // In connect mode: background click only cancels connect, keeps shape selection
      if (connectFrom) return;
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      selStartRef.current = { svgX, svgY };
      setSelBox(null);
      onDeselect();
      onEditEnd();
    }
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    // Pan (RMB)
    if (panDragRef.current.active) {
      onPanChange({
        x: panDragRef.current.panX + e.clientX - panDragRef.current.startX,
        y: panDragRef.current.panY + e.clientY - panDragRef.current.startY,
      });
    }

    // Single shape drag
    if (dragRef.current) {
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      onMoveShape(
        dragRef.current.id,
        Math.max(0, snapToGrid(svgX - dragRef.current.offX)),
        Math.max(0, snapToGrid(svgY - dragRef.current.offY)),
      );
    }

    // Multi shape drag
    if (multiDragRef.current) {
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      onMoveMultiple(
        multiDragRef.current.items.map(({ id, offX, offY }) => ({
          id,
          x: Math.max(0, snapToGrid(svgX - offX)),
          y: Math.max(0, snapToGrid(svgY - offY)),
        }))
      );
    }

    // Rubber-band rect
    if (selStartRef.current) {
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      const x1 = Math.min(selStartRef.current.svgX, svgX);
      const y1 = Math.min(selStartRef.current.svgY, svgY);
      const x2 = Math.max(selStartRef.current.svgX, svgX);
      const y2 = Math.max(selStartRef.current.svgY, svgY);
      setSelBox({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    }

    const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
    onCursorMove(Math.max(0, Math.floor(svgX / CELL)), Math.max(0, Math.floor(svgY / CELL)));
  };

  const onSvgMouseUp = () => {
    panDragRef.current.active = false;
    dragRef.current = null;
    multiDragRef.current = null;

    // Finish rubber-band selection
    if (selStartRef.current && selBox && selBox.w > 4 && selBox.h > 4) {
      const hit = shapes.filter((sh) => {
        const sx = sh.x * CELL, sy = sh.y * CELL;
        const sw = sh.w * CELL, sh2 = sh.h * CELL;
        return sx < selBox.x + selBox.w && sx + sw > selBox.x &&
               sy < selBox.y + selBox.h && sy + sh2 > selBox.y;
      });
      if (hit.length > 0) onSelectMultiple(hit.map((s) => s.id));
    }
    selStartRef.current = null;
    setSelBox(null);
  };

  const onShapeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (pendingType) {
      const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);
      onPlaceShape(Math.max(0, Math.floor(svgX / CELL)), Math.max(0, Math.floor(svgY / CELL)));
      return;
    }
    if (connectFrom || e.button !== 0) return;

    const { x: svgX, y: svgY } = toSvg(e.clientX, e.clientY);

    // If shape is in multi-selection → start multi-drag
    if (selectedIds.includes(id)) {
      const selShapes = shapes.filter((s) => selectedIds.includes(s.id));
      multiDragRef.current = {
        items: selShapes.map((s) => ({
          id: s.id,
          offX: svgX - s.x * CELL,
          offY: svgY - s.y * CELL,
        })),
      };
      return;
    }

    // Single drag
    const shape = shapes.find((s) => s.id === id)!;
    dragRef.current = {
      id,
      offX: svgX - shape.x * CELL,
      offY: svgY - shape.y * CELL,
    };
    onSelectShape(id);
  };

  const isPanning = panDragRef.current.active;
  const cursor = pendingType ? "crosshair" : isPanning ? "grabbing" : "default";

  return (
    <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
      <svg
        ref={svgRef}
        width="100%" height="100%"
        style={{ display: "block", cursor }}
        onMouseDown={onSvgMouseDown}
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgMouseUp}
        onMouseLeave={onSvgMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="smallGrid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="#0f2318" strokeWidth={0.8} />
          </pattern>
          <pattern id="grid" width={CELL * 4} height={CELL * 4} patternUnits="userSpaceOnUse">
            <rect width={CELL * 4} height={CELL * 4} fill="url(#smallGrid)" />
            <path d={`M ${CELL * 4} 0 L 0 0 0 ${CELL * 4}`} fill="none" stroke="#122a1e" strokeWidth={1.2} />
          </pattern>
          {/* filled end */}
          <marker id="arr-filled" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
          <marker id="arr-filled-sel" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
          </marker>
          {/* empty (hollow) end — fill with canvas bg so triangle looks hollow */}
          <marker id="arr-empty" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#030712" stroke="#10b981" strokeWidth={1.5} />
          </marker>
          <marker id="arr-empty-sel" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#030712" stroke="#f59e0b" strokeWidth={1.5} />
          </marker>
          {/* filled start (source / both) — refX=9 so tip aligns with shape boundary */}
          <marker id="arr-start" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
          <marker id="arr-start-sel" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <rect data-bg="true"
            x={-CELL * 4} y={-CELL * 4}
            width={SVG_W + CELL * 8} height={SVG_H + CELL * 8}
            fill="url(#grid)"
          />

          {edges.map((ed) => (
            <EdgeEl
              key={ed.id}
              edge={ed}
              shapes={shapes}
              selected={selectedEdgeId === ed.id}
              onClick={onSelectEdge}
            />
          ))}

          {shapes.map((sh) => (
            <ShapeRenderer
              key={sh.id}
              shape={sh}
              selected={selectedId === sh.id || selectedIds.includes(sh.id)}
              connecting={connectFrom === sh.id}
              connectMode={!!connectFrom}
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

          {/* Rubber-band selection rectangle */}
          {selBox && (
            <rect
              x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h}
              fill="rgba(16,185,129,0.06)"
              stroke="#10b981"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom},${3 / zoom}`}
              pointerEvents="none"
            />
          )}
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

      {selectedEdgeId && (() => {
        const edge = edges.find((e) => e.id === selectedEdgeId);
        if (!edge) return null;
        const current = edge.arrowType ?? "filled";
        const ARROW_TYPES: { type: ArrowType; label: string; title: string }[] = [
          { type: "line",   label: "———", title: "Линия (без стрелки)" },
          { type: "filled", label: "—→",  title: "Стрелка заполненная" },
          { type: "empty",  label: "—▷",  title: "Стрелка пустая"     },
          { type: "source", label: "←—",  title: "Стрелка от источника" },
          { type: "both",   label: "↔",   title: "Двойная стрелка"    },
        ];
        return (
          <div style={{
            position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 4, alignItems: "center",
            background: "#0a0f1a", border: "1px solid #1e3a2f", borderRadius: 8,
            padding: "4px 10px", zIndex: 20,
          }}>
            <span style={{ color: "#4b5563", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", marginRight: 4 }}>
              arrow
            </span>
            {ARROW_TYPES.map(({ type, label, title }) => {
              const active = current === type;
              return (
                <button
                  key={type}
                  title={title}
                  onClick={() => onUpdateEdge(selectedEdgeId, { arrowType: type })}
                  style={{
                    background: active ? "#064e3b" : "transparent",
                    border: `1px solid ${active ? "#10b981" : "#374151"}`,
                    borderRadius: 4,
                    color: active ? "#10b981" : "#6b7280",
                    padding: "2px 10px",
                    cursor: "pointer",
                    fontSize: 14,
                    fontFamily: "monospace",
                    transition: "border-color 0.1s, color 0.1s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        );
      })()}

    </div>
  );
}
