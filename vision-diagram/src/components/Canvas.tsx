import { useRef, useState } from "react";
import { useDiagramStore } from "../store/useDiagramStore";
import { Shape } from "./Shape";
import { Edge } from "./Edge";

export const Canvas = () => {
  const {
    shapes,
    edges,
    tool,
    addShape,
    selectedShapeId,
    addEdge,
    selectShape,
    selectEdge,
    updateShapePosition,
  } = useDiagramStore();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;

    updateShapePosition(draggingId, x, y);
  };

  const handlePointerUp = () => setDraggingId(null);

  const handleDragStart = (e: React.PointerEvent, id: string) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setOffset({
      x: mouseX - (shape.type === "ellipse" ? shape.x : shape.x),
      y: mouseY - (shape.type === "ellipse" ? shape.y : shape.y),
    });

    setDraggingId(id);
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

if (tool === "select") {
    // Проверяем, кликнули ли именно по svg, а не по дочернему элементу
    if (e.target === e.currentTarget) {
      selectShape(undefined);
      selectEdge(undefined);
    }
    return;
  }

    if (tool === "rectangle") {
      addShape({
        type: "rectangle",
        x,
        y,
        width: 120,
        height: 60,
        text: "Rectangle",
      });
    }

    if (tool === "ellipse") {
      addShape({
        type: "ellipse",
        x,
        y,
        width: 100,
        height: 100,
        text: "Ellipse",
      });
    }

  };

  const handleShapeClickForEdge = (id: string) => {
    if (tool !== "edge") return;

    if (!selectedShapeId) selectShape(id);
    else {
      addEdge({ source: selectedShapeId, target: id });
      selectShape(undefined);
    }
  };

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-gray-100 overflow-visible"
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Маркер стрелки */}
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="10"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L10,5 L0,10 Z" fill="black" />
        </marker>
      </defs>

      {/* Стрелки */}
      {edges.map((edge) => (
        <Edge key={edge.id} edge={edge} shapes={shapes} />
      ))}

      {/* Фигуры */}
      {shapes.map((shape) => (
        <g key={shape.id} onClick={() => handleShapeClickForEdge(shape.id)}>
          <Shape shape={shape} onDragStart={handleDragStart} />
        </g>
      ))}
    </svg>
  );
};
