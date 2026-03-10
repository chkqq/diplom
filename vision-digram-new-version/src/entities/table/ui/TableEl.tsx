import { useState, useRef } from "react";
import type { Shape } from "../../../shared/store/diagramStore";
import { CELL } from "../../../shared/config/grid";
import { ResizeHandles } from "../../../features/resize-shape/model/resizeHandles";
import { RotateHandle } from "../../../features/rotate-shape/model/rotateHandle";
import type { ResizeHandle } from "../../../features/resize-shape/model/resizeHandles";

interface TableElProps {
  shape: Shape;
  selected: boolean;
  connecting: boolean;
  connectMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  pan: { x: number; y: number };
  zoom: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectClick: (e: React.MouseEvent) => void;
  onUpdate: (props: Partial<Omit<Shape, "id">>) => void;
  onResize: (id: string, x: number, y: number, w: number, h: number) => void;
  onEditStart: (shapeId: string, anchor: { x: number; y: number }) => void;
  onEditEnd: () => void;
  onRotate: (id: string, rotation: number) => void;
}

export function TableEl({
  shape, selected, connecting, connectMode,
  svgRef, pan, zoom,
  onMouseDown, onConnectClick, onUpdate,
  onResize, onRotate, onEditStart,
}: TableElProps) {
  const rows  = shape.rows  ?? 3;
  const cols  = shape.cols  ?? 3;
  const cells = shape.cells ?? Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => `Value ${r * cols + c + 1}`)
  );

  const [editCell, setEditCell] = useState<[number, number] | null>(null);
  const [draft, setDraft]       = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const px = shape.x * CELL;
  const py = shape.y * CELL;
  const pw = shape.w * CELL;
  const ph = shape.h * CELL;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const rotation = shape.rotation ?? 0;

  const stroke = selected ? "#6ee7b7" : "#374151";
  const accent = selected ? "#6ee7b7" : "#4ade80";

  const cellW = pw / cols;
  const cellH = ph / rows;

  const startEdit = (r: number, c: number, val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditCell([r, c]);
    setDraft(val);
    setTimeout(() => inputRef.current?.focus(), 0);
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (svgRect) {
      onEditStart(shape.id, { x: cx * zoom + pan.x + svgRect.left, y: py * zoom + pan.y + svgRect.top });
    }
  };

  const commitEdit = () => {
    if (!editCell) return;
    const [r, c] = editCell;
    const newCells = cells.map((row) => [...row]);
    // expand if needed
    while (newCells.length <= r) newCells.push(Array(cols).fill(""));
    while (newCells[r].length <= c) newCells[r].push("");
    newCells[r][c] = draft;
    onUpdate({ cells: newCells });
    setEditCell(null);
  };

  const addRow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRows = rows + 1;
    const newCells = [...cells, Array(cols).fill("")];
    onUpdate({ rows: newRows, cells: newCells, h: Math.max(shape.h, newRows * 2) });
  };

  const removeRow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rows <= 1) return;
    onUpdate({ rows: rows - 1, cells: cells.slice(0, rows - 1) });
  };

  const addCol = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCols = cols + 1;
    const newCells = cells.map((row) => [...row, ""]);
    onUpdate({ cols: newCols, cells: newCells, w: Math.max(shape.w, newCols * 2) });
  };

  const removeCol = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cols <= 1) return;
    onUpdate({ cols: cols - 1, cells: cells.map((row) => row.slice(0, cols - 1)) });
  };

  // Resize
  const resizeRef = useRef<any>(null);
  const onResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    resizeRef.current = { handle, startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y, origW: shape.w, origH: shape.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const { handle, startX, startY, origX, origY, origW, origH } = resizeRef.current;
      const dx = Math.round((ev.clientX - startX) / (CELL * zoom));
      const dy = Math.round((ev.clientY - startY) / (CELL * zoom));
      let nx = origX, ny = origY, nw = origW, nh = origH;
      if (handle.includes("e")) nw = Math.max(2, origW + dx);
      if (handle.includes("s")) nh = Math.max(1, origH + dy);
      if (handle.includes("w")) { nx = origX + dx; nw = Math.max(2, origW - dx); }
      if (handle.includes("n")) { ny = origY + dy; nh = Math.max(1, origH - dy); }
      onResize(shape.id, Math.max(0, nx), Math.max(0, ny), nw, nh);
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Rotate
  const onRotateStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const svgRect = svgRef.current!.getBoundingClientRect();
    const rcx = cx * zoom + pan.x + svgRect.left;
    const rcy = cy * zoom + pan.y + svgRect.top;
    const startAngle = Math.atan2(e.clientY - rcy, e.clientX - rcx) * (180 / Math.PI);
    const origRotation = shape.rotation ?? 0;
    const onMove = (ev: MouseEvent) => {
      const angle = Math.atan2(ev.clientY - rcy, ev.clientX - rcx) * (180 / Math.PI);
      onRotate(shape.id, Math.round(origRotation + (angle - startAngle)));
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
      <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
        {/* Outer border */}
        <rect x={px} y={py} width={pw} height={ph} fill="#111827" stroke={stroke} strokeWidth={1.5} rx={4} />

        {/* Grid lines */}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const cellVal = cells[r]?.[c] ?? "";
            const fx = px + c * cellW;
            const fy = py + r * cellH;
            const isEditing = editCell?.[0] === r && editCell?.[1] === c;
            return (
              <g key={`${r}-${c}`}>
                <rect x={fx} y={fy} width={cellW} height={cellH}
                  fill={r === 0 ? "#0f2a1e" : "#111827"}
                  stroke="#1f2937" strokeWidth={0.8}
                  onDoubleClick={(e) => startEdit(r, c, cellVal, e)}
                />
                {isEditing ? (
                  <foreignObject x={fx + 2} y={fy + cellH / 2 - 11} width={cellW - 4} height={22}>
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Tab") { e.preventDefault(); commitEdit(); } e.stopPropagation(); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#d1fae5", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", padding: 0, textAlign: "center" }}
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={fx + cellW / 2} y={fy + cellH / 2 + 4}
                    textAnchor="middle"
                    fill={r === 0 ? "#6ee7b7" : "#9ca3af"}
                    fontSize={11}
                    fontFamily="'JetBrains Mono', monospace"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >{cellVal}</text>
                )}
              </g>
            );
          })
        )}

        {/* Outer border on top */}
        <rect x={px} y={py} width={pw} height={ph} fill="none" stroke={stroke} strokeWidth={1.5} rx={4} />

        {/* Row/col controls */}
        {selected && (
          <>
            {/* Add/remove row */}
            <g>
              <text x={px + pw + 6} y={py + 14} fill="#10b981" fontSize={14} style={{ cursor: "pointer", userSelect: "none" }} onClick={addRow}>+</text>
              <text x={px + pw + 6} y={py + 30} fill="#f87171" fontSize={14} style={{ cursor: "pointer", userSelect: "none" }} onClick={removeRow}>−</text>
              <text x={px + pw + 4} y={py + 44} fill="#6b7280" fontSize={9} style={{ userSelect: "none" }}>row</text>
            </g>
            {/* Add/remove col */}
            <g>
              <text x={px + 8}  y={py + ph + 16} fill="#10b981" fontSize={14} style={{ cursor: "pointer", userSelect: "none" }} onClick={addCol}>+</text>
              <text x={px + 22} y={py + ph + 16} fill="#f87171" fontSize={14} style={{ cursor: "pointer", userSelect: "none" }} onClick={removeCol}>−</text>
              <text x={px + 36} y={py + ph + 16} fill="#6b7280" fontSize={9}  style={{ userSelect: "none" }}>col</text>
            </g>
          </>
        )}

        {/* Connect port — только в режиме connect */}
        {connectMode && (
          <circle cx={px + pw} cy={cy} r={6}
            fill={connecting ? "#fbbf24" : "#064e3b"}
            stroke={connecting ? "#fbbf24" : "#10b981"}
            strokeWidth={1.5} style={{ cursor: "crosshair" }}
            onClick={(e) => { e.stopPropagation(); onConnectClick(e); }}
          />
        )}

        {selected && (
          <rect x={px - 2} y={py - 2} width={pw + 4} height={ph + 4}
            rx={6} fill="none" stroke={accent} strokeWidth={1.5}
            strokeDasharray="4 3" opacity={0.7}
          />
        )}
      </g>

      {selected && (
        <>
          <ResizeHandles shape={shape} onResizeStart={onResizeStart} />
          <RotateHandle shape={shape} onRotateStart={onRotateStart} />
        </>
      )}
    </g>
  );
}
