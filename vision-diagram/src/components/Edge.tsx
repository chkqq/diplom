import type { Edge as EdgeType, Shape } from "../models/types";
import { useDiagramStore } from "../store/useDiagramStore";
import { useState } from "react";

interface Props {
  edge: EdgeType;
  shapes: Shape[];
}

export const Edge = ({ edge, shapes }: Props) => {
  const {
    updateEdgeControl,
    selectedEdgeId,
    selectEdge,
    tool,
  } = useDiagramStore();

  const [dragging, setDragging] = useState(false);
  const isSelected = selectedEdgeId === edge.id;

  const source = shapes.find((s) => s.id === edge.source);
  const target = shapes.find((s) => s.id === edge.target);
  if (!source || !target) return null;

  const getCenter = (s: Shape) =>
    s.type === "ellipse"
      ? { x: s.x, y: s.y }
      : { x: s.x + s.width / 2, y: s.y + s.height / 2 };

  const { x: x1, y: y1 } = getCenter(source);
  const { x: x2, y: y2 } = getCenter(target);

  const cx = edge.control?.x ?? (x1 + x2) / 2;
  const cy = edge.control?.y ?? (y1 + y2) / 2 - 50;

  if ([x1, y1, x2, y2, cx, cy].some((v) => isNaN(v))) return null;

const handlePointerDown = (e: React.PointerEvent) => {
  if (tool !== "select") return;

  e.stopPropagation();
  selectEdge(edge.id);
};

  const handleControlPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);

    const svg = (e.currentTarget as SVGCircleElement).ownerSVGElement;
    if (!svg) return;

    const handleMove = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateEdgeControl(edge.id, x, y);
    };

    const handleUp = () => {
      setDragging(false);
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  return (
    <>
      <path
        d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
        stroke={isSelected ? "blue" : "black"}
        strokeWidth={isSelected ? 2 : 1}
        fill="transparent"
        markerEnd="url(#arrow)"
        onPointerDown={handlePointerDown}
        cursor={tool === "select" ? "pointer" : "default"}
      />

      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={dragging ? "blue" : "black"}
          cursor="pointer"
          onPointerDown={handleControlPointerDown}
        />
      )}
    </>
  );
};
