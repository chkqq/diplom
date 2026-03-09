import { CELL } from "../config/grid";
import type { Shape } from "../store/diagramStore";

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function snapToGrid(v: number): number {
  return Math.round(v / CELL);
}

export function shapeCenter(s: Shape): { x: number; y: number } {
  return {
    x: (s.x + s.w / 2) * CELL,
    y: (s.y + s.h / 2) * CELL,
  };
}

export function buildEdgePath(a: Shape, b: Shape): string {
  const from = shapeCenter(a);
  const to   = shapeCenter(b);
  const mx   = Math.round((from.x + to.x) / 2 / CELL) * CELL;
  return `M ${from.x} ${from.y} L ${mx} ${from.y} L ${mx} ${to.y} L ${to.x} ${to.y}`;
}
