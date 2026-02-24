import type { Shape as ShapeType } from "../models/types";
import { useDiagramStore } from "../store/useDiagramStore";

interface Props {
  shape: ShapeType;
  onDragStart: (e: React.PointerEvent, id: string) => void;
}

export const Shape = ({ shape, onDragStart }: Props) => {
  const { selectedShapeId, selectShape, tool, addEdge } = useDiagramStore();
  const isSelected = selectedShapeId === shape.id;

  // Общий обработчик клика по фигуре
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (tool === "select") {
      selectShape(shape.id);
    } else if (tool === "edge") {
      if (!selectedShapeId) selectShape(shape.id);
      else {
        addEdge({ source: selectedShapeId, target: shape.id });
        selectShape(undefined);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === "select") {
      e.stopPropagation();
      onDragStart(e, shape.id);
    }
  };

  return (
    <g
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      cursor={tool === "select" ? "move" : "pointer"}
    >
      {shape.type === "rectangle" ? (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          stroke={isSelected ? "blue" : "black"}
          strokeWidth={isSelected ? 2 : 1}
          fill="white"
        />
      ) : (
        <ellipse
          cx={shape.x}
          cy={shape.y}
          rx={shape.width / 2}
          ry={shape.height / 2}
          stroke={isSelected ? "blue" : "black"}
          strokeWidth={isSelected ? 2 : 1}
          fill="white"
        />
      )}

      {shape.text && (
        <text
          x={shape.type === "rectangle" ? shape.x + shape.width / 2 : shape.x}
          y={shape.type === "rectangle" ? shape.y + shape.height / 2 : shape.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="select-none text-sm"
        >
          {shape.text}
        </text>
      )}
    </g>
  );
};
