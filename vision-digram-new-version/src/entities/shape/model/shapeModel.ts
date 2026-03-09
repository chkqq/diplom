import type { Shape, ShapeType } from "../../../shared/types/diagram";
import { uid } from "../../../shared/lib";

export function createShape(type: ShapeType): Shape {
  return {
    id: uid(),
    type,
    x: 3 + Math.floor(Math.random() * 5),
    y: 3 + Math.floor(Math.random() * 4),
    w: 4,
    h: 2,
    text: type,
  };
}

export function updateShapeLabel(shapes: Shape[], id: string, text: string): Shape[] {
  return shapes.map((s) => (s.id === id ? { ...s, text } : s));
}

export function moveShape(shapes: Shape[], id: string, x: number, y: number): Shape[] {
  return shapes.map((s) => (s.id === id ? { ...s, x, y } : s));
}

export function removeShape(shapes: Shape[], id: string): Shape[] {
  return shapes.filter((s) => s.id !== id);
}
