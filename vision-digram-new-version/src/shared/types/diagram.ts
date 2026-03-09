export type ShapeType = "rectangle" | "circle" | "diamond";

export interface Shape {
  id: string;
  type: ShapeType;
  x: number; // grid cells
  y: number; // grid cells
  w: number; // grid cells
  h: number; // grid cells
  text: string;
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
