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
  const fromC = shapeCenter(a);
  const toC   = shapeCenter(b);

  const dx = Math.abs(toC.x - fromC.x);
  const dy = Math.abs(toC.y - fromC.y);

  if (dx >= dy) {
    // Horizontal-dominant: exit left/right boundary of source, enter left/right boundary of target
    const goRight = toC.x >= fromC.x;
    const startX  = goRight ? (a.x + a.w) * CELL : a.x * CELL;
    const startY  = fromC.y;
    const endX    = goRight ? b.x * CELL : (b.x + b.w) * CELL;
    const endY    = toC.y;
    const mx      = Math.round((startX + endX) / 2 / CELL) * CELL;
    return `M ${startX} ${startY} L ${mx} ${startY} L ${mx} ${endY} L ${endX} ${endY}`;
  } else {
    // Vertical-dominant: exit top/bottom boundary of source, enter top/bottom boundary of target
    const goDown = toC.y >= fromC.y;
    const startX = fromC.x;
    const startY = goDown ? (a.y + a.h) * CELL : a.y * CELL;
    const endX   = toC.x;
    const endY   = goDown ? b.y * CELL : (b.y + b.h) * CELL;
    const my     = Math.round((startY + endY) / 2 / CELL) * CELL;
    return `M ${startX} ${startY} L ${startX} ${my} L ${endX} ${my} L ${endX} ${endY}`;
  }
}
