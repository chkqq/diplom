export type ShapeType = "rectangle" | "circle" | "diamond" | "list" | "table";

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;      // grid cells
  y: number;      // grid cells
  w: number;      // grid cells
  h: number;      // grid cells
  text: string;
  rotation?: number; // degrees
  // list-specific
  items?: string[];
  // table-specific
  rows?: number;
  cols?: number;
  cells?: string[][];  // [row][col]
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface Diagram {
  shapes: Shape[];
  edges: Edge[];
}
