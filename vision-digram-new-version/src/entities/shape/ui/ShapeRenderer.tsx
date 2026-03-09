import type { Shape } from "../../../shared/store/diagramStore";
import { ShapeEl } from "./ShapeEl";
import { ListEl } from "../../list/ui/ListEl";
import { TableEl } from "../../table/ui/TableEl";

interface ShapeRendererProps {
  shape: Shape;
  selected: boolean;
  connecting: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  pan: { x: number; y: number };
  zoom: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectClick: (e: React.MouseEvent) => void;
  onUpdate: (id: string, props: Partial<Omit<Shape, "id">>) => void;
  onResize: (id: string, x: number, y: number, w: number, h: number) => void;
  onRotate: (id: string, rotation: number) => void;
  onEditStart: (shapeId: string, anchor: { x: number; y: number }) => void;
  onEditEnd: () => void;
}

export function ShapeRenderer(props: ShapeRendererProps) {
  const { shape, onUpdate, onEditStart, onEditEnd, ...rest } = props;

  if (shape.type === "list") {
    return (
      <ListEl
        {...rest}
        shape={shape}
        onUpdate={(p) => onUpdate(shape.id, p)}
        onEditStart={onEditStart}
        onEditEnd={onEditEnd}
      />
    );
  }

  if (shape.type === "table") {
    return (
      <TableEl
        {...rest}
        shape={shape}
        onUpdate={(p) => onUpdate(shape.id, p)}
        onEditStart={onEditStart}
        onEditEnd={onEditEnd}
      />
    );
  }

  return (
    <ShapeEl
      {...rest}
      shape={shape}
      onLabelChange={(text) => onUpdate(shape.id, { text })}
      onEditStart={onEditStart}
      onEditEnd={onEditEnd}
    />
  );
}
