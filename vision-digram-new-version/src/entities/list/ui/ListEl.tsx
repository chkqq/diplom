import { useState, useRef } from "react";
import type { Shape } from "../../../shared/store/diagramStore";
import { CELL } from "../../../shared/config/grid";
import { ResizeHandles } from "../../../features/resize-shape/model/resizeHandles";
import { RotateHandle } from "../../../features/rotate-shape/model/rotateHandle";
import type { ResizeHandle } from "../../../features/resize-shape/model/resizeHandles";

interface ListElProps {
  shape: Shape;
  selected: boolean;
  connecting: boolean;
  svgRef: React.RefObject<SVGSVGElement>;
  pan: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectClick: (e: React.MouseEvent) => void;
  onUpdate: (props: Partial<Omit<Shape, "id">>) => void;
  onResize: (id: string, x: number, y: number, w: number, h: number) => void;
  onEditStart: (shapeId: string, anchor: { x: number; y: number }) => void;
  onEditEnd: () => void;
  onRotate: (id: string, rotation: number) => void;
}

const HEADER_H = 28;
const ROW_H    = 28;

export function ListEl({
  shape, selected, connecting,
  svgRef, pan,
  onMouseDown, onConnectClick, onUpdate,
  onResize, onRotate, onEditStart, onEditEnd,
}: ListElProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const items = shape.items ?? ["Item 1", "Item 2", "Item 3"];

  // Height is always auto-calculated to fit all rows exactly
  const ph = HEADER_H + items.length * ROW_H + (selected ? ROW_H : 0);
  const px = shape.x * CELL;
  const py = shape.y * CELL;
  const pw = shape.w * CELL;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const rotation = shape.rotation ?? 0;
  const clipId = `list-clip-${shape.id}`;

  const stroke = selected ? "#6ee7b7" : "#374151";
  const accent = selected ? "#6ee7b7" : connecting ? "#fbbf24" : "#4ade80";

  const startEdit = (idx: number, current: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIdx(idx);
    setDraft(current);
    setTimeout(() => inputRef.current?.focus(), 0);
    // fire text format toolbar
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (svgRect) {
      onEditStart(shape.id, { x: px + pw / 2 + pan.x + svgRect.left, y: py + pan.y + svgRect.top });
    }
  };

  const commitEdit = () => {
    if (editingIdx === null) return;
    if (editingIdx === -1) {
      onUpdate({ text: draft });
    } else {
      const newItems = [...items];
      newItems[editingIdx] = draft;
      onUpdate({ items: newItems });
    }
    setEditingIdx(null);
  };

  const addItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newItems = [...items, `Item ${items.length + 1}`];
    // update h in store so resize handles stay correct
    const newH = Math.ceil((HEADER_H + (newItems.length + 1) * ROW_H) / CELL);
    onUpdate({ items: newItems, h: newH });
  };

  const removeItem = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newItems = items.filter((_, i) => i !== idx);
    const newH = Math.ceil((HEADER_H + (newItems.length + 1) * ROW_H) / CELL);
    onUpdate({ items: newItems, h: Math.max(2, newH) });
  };

  // Resize handlers (only width makes sense; height is auto)
  const resizeRef = useRef<any>(null);
  const onResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    resizeRef.current = {
      handle, startX: e.clientX, startY: e.clientY,
      origX: shape.x, origY: shape.y, origW: shape.w, origH: shape.h,
    };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const { handle, startX, startY, origX, origY, origW, origH } = resizeRef.current;
      const dx = Math.round((ev.clientX - startX) / CELL);
      const dy = Math.round((ev.clientY - startY) / CELL);
      let nx = origX, ny = origY, nw = origW, nh = origH;
      if (handle.includes("e")) nw = Math.max(2, origW + dx);
      if (handle.includes("w")) { nx = origX + dx; nw = Math.max(2, origW - dx); }
      if (handle.includes("n")) { ny = origY + dy; }
      onResize(shape.id, Math.max(0, nx), Math.max(0, ny), nw, nh);
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Rotate handlers
  const onRotateStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const svgRect = svgRef.current!.getBoundingClientRect();
    const rcx = cx + pan.x + svgRect.left;
    const rcy = cy + pan.y + svgRect.top;
    const startAngle = Math.atan2(e.clientY - rcy, e.clientX - rcx) * (180 / Math.PI);
    const origRotation = shape.rotation ?? 0;
    const onMove = (ev: MouseEvent) => {
      const angle = Math.atan2(ev.clientY - rcy, ev.clientX - rcx) * (180 / Math.PI);
      onRotate(shape.id, Math.round(origRotation + (angle - startAngle)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Fake shape with correct ph for resize handles
  const shapeForHandles = { ...shape, h: Math.ceil(ph / CELL) };

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
      <defs>
        <clipPath id={clipId}>
          <rect x={px} y={py} width={pw} height={ph} rx={6} />
        </clipPath>
      </defs>

      <g onMouseDown={onMouseDown} style={{ cursor: "move" }}>
        {/* Outer border */}
        <rect x={px} y={py} width={pw} height={ph} rx={6}
          fill="#111827" stroke={stroke} strokeWidth={1.5} />

        {/* All inner content clipped to box */}
        <g clipPath={`url(#${clipId})`}>
          {/* Header bg */}
          <rect x={px} y={py} width={pw} height={HEADER_H} fill="#0f2a1e" />
          <line x1={px} y1={py + HEADER_H} x2={px + pw} y2={py + HEADER_H}
            stroke="#374151" strokeWidth={1} />

          {/* Header icon */}
          <text x={px + 10} y={py + 18} fill="#10b981" fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            style={{ pointerEvents: "none", userSelect: "none" }}>☰</text>

          {/* Header title */}
          {editingIdx === -1 ? (
            <foreignObject x={px + 26} y={py + 6} width={pw - 36} height={20}>
              <input ref={inputRef} value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); e.stopPropagation(); }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#d1fae5", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", padding: 0 }}
              />
            </foreignObject>
          ) : (
            <text x={px + 26} y={py + 18} fill="#d1fae5" fontSize={12}
              fontFamily="'JetBrains Mono', monospace"
              style={{ userSelect: "none" }}
              onDoubleClick={(e) => startEdit(-1, shape.text, e)}
            >{shape.text || "List"}</text>
          )}

          {/* Rows */}
          {items.map((item, i) => {
            const ry = py + HEADER_H + i * ROW_H;
            return (
              <g key={i}>
                <line x1={px} y1={ry} x2={px + pw} y2={ry} stroke="#1f2937" strokeWidth={1} />
                {editingIdx === i ? (
                  <foreignObject x={px + 8} y={ry + 6} width={pw - 36} height={20}>
                    <input ref={inputRef} value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); e.stopPropagation(); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#d1fae5", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", padding: 0 }}
                    />
                  </foreignObject>
                ) : (
                  <text x={px + 8} y={ry + 18} fill="#9ca3af" fontSize={12}
                    fontFamily="'JetBrains Mono', monospace"
                    style={{ userSelect: "none" }}
                    onDoubleClick={(e) => startEdit(i, item, e)}
                  >{item}</text>
                )}
                {selected && (
                  <text x={px + pw - 16} y={ry + 18} fill="#4b5563" fontSize={11}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={(e) => removeItem(i, e)}
                  >✕</text>
                )}
              </g>
            );
          })}

          {/* Add item row */}
          {selected && (() => {
            const addY = py + HEADER_H + items.length * ROW_H;
            return (
              <g>
                <line x1={px} y1={addY} x2={px + pw} y2={addY} stroke="#1f2937" strokeWidth={1} />
                <text x={cx} y={addY + 18} textAnchor="middle"
                  fill="#10b981" fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={addItem}
                >+ add item</text>
              </g>
            );
          })()}
        </g>{/* end clipPath */}

        {/* Connect port */}
        <circle cx={px + pw} cy={cy} r={6}
          fill={connecting ? "#fbbf24" : "#064e3b"}
          stroke={connecting ? "#fbbf24" : "#10b981"}
          strokeWidth={1.5} style={{ cursor: "crosshair" }}
          onClick={(e) => { e.stopPropagation(); onConnectClick(e); }}
        />

        {/* Selection glow */}
        {selected && (
          <rect x={px - 2} y={py - 2} width={pw + 4} height={ph + 4}
            rx={8} fill="none" stroke={accent} strokeWidth={1.5}
            strokeDasharray="4 3" opacity={0.7}
          />
        )}
      </g>

      {selected && (
        <>
          <ResizeHandles shape={shapeForHandles} onResizeStart={onResizeStart} />
          <RotateHandle shape={shapeForHandles} onRotateStart={onRotateStart} />
        </>
      )}
    </g>
  );
}
