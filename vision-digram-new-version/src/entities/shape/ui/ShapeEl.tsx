import { useState, useRef, useEffect } from "react";
import type { Shape } from "../../../shared/store/diagramStore";
import { DEFAULT_TEXT_STYLE } from "../../../shared/store/diagramStore";
import { CELL } from "../../../shared/config/grid";
import { ResizeHandles } from "../../../features/resize-shape/model/resizeHandles";
import { RotateHandle } from "../../../features/rotate-shape/model/rotateHandle";
import type { ResizeHandle } from "../../../features/resize-shape/model/resizeHandles";

interface ShapeElProps {
  shape: Shape;
  selected: boolean;
  connecting: boolean;
  svgRef: React.RefObject<SVGSVGElement>;
  pan: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectClick: (e: React.MouseEvent) => void;
  onLabelChange: (text: string) => void;
  onResize: (id: string, x: number, y: number, w: number, h: number) => void;
  onRotate: (id: string, rotation: number) => void;
  onEditStart: (shapeId: string, anchor: { x: number; y: number }) => void;
  onEditEnd: () => void;
}

export function ShapeEl({
  shape, selected, connecting,
  svgRef, pan,
  onMouseDown, onConnectClick, onLabelChange,
  onResize, onRotate, onEditStart, onEditEnd,
}: ShapeElProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shape.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<any>(null);
  const rotateRef = useRef<any>(null);

  const ts = { ...DEFAULT_TEXT_STYLE, ...shape.textStyle };

  useEffect(() => { if (!editing) setDraft(shape.text); }, [shape.text, editing]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const px = shape.x * CELL;
  const py = shape.y * CELL;
  const pw = shape.w * CELL;
  const ph = shape.h * CELL;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const rotation = shape.rotation ?? 0;

  const commitEdit = () => {
    setEditing(false);
    onLabelChange(draft);
    onEditEnd();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(shape.text);
    setEditing(true);
    // compute screen coords for toolbar anchor (top-center of shape)
    const svgRect = svgRef.current!.getBoundingClientRect();
    const ax = px + pw / 2 + pan.x + svgRect.left;
    const ay = py + pan.y + svgRect.top;
    onEditStart(shape.id, { x: ax, y: ay });
  };

  // Resize
  const onResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    resizeRef.current = { handle, startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y, origW: shape.w, origH: shape.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const { handle, startX, startY, origX, origY, origW, origH } = resizeRef.current;
      const dx = Math.round((ev.clientX - startX) / CELL);
      const dy = Math.round((ev.clientY - startY) / CELL);
      let nx = origX, ny = origY, nw = origW, nh = origH;
      if (handle.includes("e")) nw = Math.max(1, origW + dx);
      if (handle.includes("s")) nh = Math.max(1, origH + dy);
      if (handle.includes("w")) { nx = origX + dx; nw = Math.max(1, origW - dx); }
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
    const rcx = cx + pan.x + svgRect.left;
    const rcy = cy + pan.y + svgRect.top;
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

  const fill   = selected ? "#1a2e2a" : "#111827";
  const stroke = selected ? "#6ee7b7" : "#374151";
  const accent = selected ? "#6ee7b7" : connecting ? "#fbbf24" : "#4ade80";

  const renderBody = () => {
    if (shape.type === "rectangle")
      return <rect x={px} y={py} width={pw} height={ph} rx={6} fill={fill} stroke={stroke} strokeWidth={1.5} />;
    if (shape.type === "circle")
      return <ellipse cx={cx} cy={cy} rx={pw / 2} ry={ph / 2} fill={fill} stroke={stroke} strokeWidth={1.5} />;
    return (
      <polygon
        points={`${cx},${py} ${px+pw},${cy} ${cx},${py+ph} ${px},${cy}`}
        fill={fill} stroke={stroke} strokeWidth={1.5}
      />
    );
  };

  const fontStyle = [ts.italic ? "italic" : "", "normal"].filter(Boolean).join(" ");
  const fontWeight = ts.bold ? "700" : "400";
  const textDecoration = [ts.underline ? "underline" : "", ts.strikethrough ? "line-through" : ""].filter(Boolean).join(" ") || "none";
  const textAnchor = ts.align === "left" ? "start" : ts.align === "right" ? "end" : "middle";
  const labelX = ts.align === "left" ? px + 8 : ts.align === "right" ? px + pw - 8 : cx;

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
      <g
        style={{ cursor: editing ? "text" : "move" }}
        onMouseDown={(e) => { if (!editing) onMouseDown(e); }}
        onDoubleClick={handleDoubleClick}
      >
        {renderBody()}

        {selected && (
          <rect x={px-2} y={py-2} width={pw+4} height={ph+4}
            rx={8} fill="none" stroke={accent} strokeWidth={1.5}
            strokeDasharray="4 3" opacity={0.7} />
        )}

        {editing ? (
          <foreignObject x={px+6} y={cy-14} width={pw-12} height={28}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") { setEditing(false); setDraft(shape.text); onEditEnd(); }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", background: "#0a1a14",
                border: "1px solid #10b981", borderRadius: 4, outline: "none",
                color: ts.color,
                fontSize: ts.fontSize,
                fontFamily: `'${ts.fontFamily}', monospace`,
                fontWeight,
                fontStyle,
                textDecoration,
                textAlign: ts.align === "justify" ? "left" : ts.align,
                padding: "2px 4px", boxSizing: "border-box",
              }}
            />
          </foreignObject>
        ) : (
          <text
            x={labelX} y={cy + ts.fontSize * 0.35}
            textAnchor={textAnchor}
            fill={ts.color}
            fontSize={ts.fontSize}
            fontFamily={`'${ts.fontFamily}', monospace`}
            fontWeight={fontWeight}
            fontStyle={fontStyle}
            textDecoration={textDecoration}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {shape.text}
          </text>
        )}

        <circle cx={px+pw} cy={cy} r={6}
          fill={connecting ? "#fbbf24" : "#064e3b"}
          stroke={connecting ? "#fbbf24" : "#10b981"}
          strokeWidth={1.5} style={{ cursor: "crosshair" }}
          onClick={(e) => { e.stopPropagation(); onConnectClick(e); }}
        />
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
