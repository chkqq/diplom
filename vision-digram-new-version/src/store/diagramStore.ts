import { create } from "zustand";
import { v4 as uuid } from "uuid";

export interface Shape {
  id: string;
  type: "rectangle" | "circle" | "diamond";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
}

export interface Edge {
  id: string;
  from: string; // shape id
  to: string;   // shape id
  points: number[];
}

interface DiagramState {
  shapes: Shape[];
  edges: Edge[];
  addShape: (shape: Omit<Shape, "id">) => void;
  updateShape: (id: string, newProps: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  setEdges: (edges: Edge[]) => void;
  reset: () => void;
}

export const useDiagramStore = create<DiagramState>((set) => ({
  shapes: [],
  edges: [],
  addShape: (shape) => set((state) => ({ shapes: [...state.shapes, { ...shape, id: uuid() }] })),
  updateShape: (id, newProps) =>
    set((state) => ({
      shapes: state.shapes.map((s) => (s.id === id ? { ...s, ...newProps } : s)),
    })),
  removeShape: (id) => set((state) => ({ shapes: state.shapes.filter((s) => s.id !== id) })),
  setEdges: (edges) => set({ edges }),
  reset: () => set({ shapes: [], edges: [] }),
}));