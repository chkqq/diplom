import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type { ShapeType } from "../types/diagram";

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;   // grid cells
  y: number;   // grid cells
  w: number;   // grid cells
  h: number;   // grid cells
  text: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

interface DiagramState {
  shapes: Shape[];
  edges: Edge[];

  addShape:    (shape: Omit<Shape, "id">) => void;
  updateShape: (id: string, props: Partial<Omit<Shape, "id">>) => void;
  removeShape: (id: string) => void;

  addEdge:     (source: string, target: string) => void;
  setEdges:    (edges: Edge[]) => void;

  loadDiagram: (shapes: Shape[], edges: Edge[]) => void;
  reset:       () => void;
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set) => ({
      shapes: [],
      edges:  [],

      addShape: (shape) =>
        set((s) => ({ shapes: [...s.shapes, { ...shape, id: uuid() }] })),

      updateShape: (id, props) =>
        set((s) => ({
          shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...props } : sh)),
        })),

      removeShape: (id) =>
        set((s) => ({
          shapes: s.shapes.filter((sh) => sh.id !== id),
          edges:  s.edges.filter((e) => e.source !== id && e.target !== id),
        })),

      addEdge: (source, target) =>
        set((s) => ({ edges: [...s.edges, { id: uuid(), source, target }] })),

      setEdges: (edges) => set({ edges }),

      loadDiagram: (shapes, edges) => set({ shapes, edges }),

      reset: () => set({ shapes: [], edges: [] }),
    }),
    {
      name: "vision-diagram", // localStorage key
      // persist only data, not actions
      partialize: (state) => ({ shapes: state.shapes, edges: state.edges }),
    }
  )
);
