export type ShapeType = "rectangle" | "ellipse";

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  control?: { x: number; y: number }; // новая точка для изгиба
}

export interface DiagramState {
  shapes: Shape[];
  edges: Edge[];
}
