import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type { ShapeType } from "../types/diagram";

export interface TextStyle {
  fontFamily:  string;   // e.g. "Helvetica"
  fontSize:    number;   // px
  bold:        boolean;
  italic:      boolean;
  underline:   boolean;
  strikethrough: boolean;
  align:       "left" | "center" | "right" | "justify";
  color:       string;   // hex
  lineHeight:  number;   // e.g. 1.2
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily:    "JetBrains Mono",
  fontSize:      12,
  bold:          false,
  italic:        false,
  underline:     false,
  strikethrough: false,
  align:         "center",
  color:         "#d1fae5",
  lineHeight:    1.2,
};

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  rotation: number;
  items: string[];
  rows: number;
  cols: number;
  cells: string[][];
  textStyle: TextStyle;
}

export type ArrowType = "line" | "filled" | "empty" | "source" | "both";

export interface Edge {
  id: string;
  source: string;
  target: string;
  arrowType?: ArrowType;
}

const MAX_HISTORY = 50;

interface Snapshot { shapes: Shape[]; edges: Edge[] }

interface DiagramState {
  shapes: Shape[];
  edges: Edge[];
  past:   Snapshot[];
  future: Snapshot[];

  addShape:    (shape: Omit<Shape, "id">) => void;
  updateShape: (id: string, props: Partial<Omit<Shape, "id">>) => void;
  removeShape: (id: string) => void;

  addEdge:          (source: string, target: string) => void;
  updateEdge:       (id: string, props: Partial<Omit<Edge, "id">>) => void;
  removeEdge:       (id: string) => void;
  setEdges:         (edges: Edge[]) => void;
  batchUpdateShapes:(updates: { id: string; props: Partial<Omit<Shape, "id">> }[]) => void;

  loadDiagram: (shapes: Shape[], edges: Edge[]) => void;
  reset:       () => void;

  undo: () => void;
  redo: () => void;
}

function pushHistory(s: DiagramState): Pick<DiagramState, "past" | "future"> {
  return {
    past:   [...s.past.slice(-(MAX_HISTORY - 1)), { shapes: s.shapes, edges: s.edges }],
    future: [],
  };
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set) => ({
      shapes: [],
      edges:  [],
      past:   [],
      future: [],

      addShape: (shape) =>
        set((s) => ({
          ...pushHistory(s),
          shapes: [...s.shapes, { ...shape, id: uuid() }],
        })),

      updateShape: (id, props) =>
        set((s) => ({
          ...pushHistory(s),
          shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...props } : sh)),
        })),

      removeShape: (id) =>
        set((s) => ({
          ...pushHistory(s),
          shapes: s.shapes.filter((sh) => sh.id !== id),
          edges:  s.edges.filter((e) => e.source !== id && e.target !== id),
        })),

      addEdge: (source, target) =>
        set((s) => ({
          ...pushHistory(s),
          edges: [...s.edges, { id: uuid(), source, target }],
        })),

      updateEdge: (id, props) =>
        set((s) => ({
          ...pushHistory(s),
          edges: s.edges.map((e) => (e.id === id ? { ...e, ...props } : e)),
        })),

      removeEdge: (id) =>
        set((s) => ({
          ...pushHistory(s),
          edges: s.edges.filter((e) => e.id !== id),
        })),

      batchUpdateShapes: (updates) =>
        set((s) => ({
          ...pushHistory(s),
          shapes: s.shapes.map((sh) => {
            const upd = updates.find((u) => u.id === sh.id);
            return upd ? { ...sh, ...upd.props } : sh;
          }),
        })),

      setEdges: (edges) =>
        set((s) => ({ ...pushHistory(s), edges })),

      loadDiagram: (shapes, edges) =>
        set((s) => ({ ...pushHistory(s), shapes, edges })),

      reset: () =>
        set((s) => ({ ...pushHistory(s), shapes: [], edges: [] })),

      undo: () =>
        set((s) => {
          if (s.past.length === 0) return s;
          const prev    = s.past[s.past.length - 1];
          const newPast = s.past.slice(0, -1);
          return {
            shapes: prev.shapes,
            edges:  prev.edges,
            past:   newPast,
            future: [{ shapes: s.shapes, edges: s.edges }, ...s.future],
          };
        }),

      redo: () =>
        set((s) => {
          if (s.future.length === 0) return s;
          const next       = s.future[0];
          const newFuture  = s.future.slice(1);
          return {
            shapes: next.shapes,
            edges:  next.edges,
            past:   [...s.past, { shapes: s.shapes, edges: s.edges }],
            future: newFuture,
          };
        }),
    }),
    {
      name: "vision-diagram",
      partialize: (state) => ({ shapes: state.shapes, edges: state.edges }),
    }
  )
);
