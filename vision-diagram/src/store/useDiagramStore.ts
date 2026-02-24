import { create } from "zustand";
import type { DiagramState, Shape, Edge } from "../models/types";
import { nanoid } from "nanoid";

type Tool = "select" | "rectangle" | "ellipse" | "edge";

interface DiagramStore extends DiagramState {
  tool: Tool;
  selectedShapeId?: string;
  updateShapePosition: (id: string, x: number, y: number) => void;
  updateEdgeControl: (id: string, x: number, y: number)  => void;
  setTool: (tool: Tool) => void;
  addShape: (shape: Omit<Shape, "id">) => void;
  addEdge: (edge: Omit<Edge, "id">) => void;
  selectShape: (id?: string) => void;
  selectedEdgeId: string | undefined;
  selectEdge: (id: string | undefined) => void;
replaceDiagram: (state: DiagramState) => void;
}


export const useDiagramStore = create<DiagramStore>((set) => ({
  shapes: [],
  edges: [],
  tool: "select",

  setTool: (tool) => set({ tool }),

  addShape: (shape) =>
    set((state) => ({
      shapes: [...state.shapes, { ...shape, id: nanoid() }],
    })),

 addEdge: (edge) =>
  set((state) => {
    const source = state.shapes.find((s) => s.id === edge.source);
    const target = state.shapes.find((s) => s.id === edge.target);
    if (!source || !target) return state;

    return {
      edges: [
        ...state.edges,
        {
          ...edge,
          id: nanoid(),
          control: {
            x: (source.x + target.x + source.width + target.width) / 4, // середина по X
            y: (source.y + target.y + source.height + target.height) / 4 - 50, // изгиб вверх
          },
        },
      ],
    };
  }),
  updateEdgeControl: (id: string, x: number, y: number) =>
  set((state) => ({
    edges: state.edges.map((e) =>
      e.id === id ? { ...e, control: { x, y } } : e
    ),
  })),

  selectShape: (id) => set({ selectedShapeId: id }),

  updateShapePosition: (id, x, y) =>
  set((state) => ({
    shapes: state.shapes.map((shape) =>
      shape.id === id ? { ...shape, x, y } : shape
    ),
  })),
  selectedEdgeId: undefined,

selectEdge: (id) => set({ selectedEdgeId: id }),
replaceDiagram: (state: DiagramState) =>
  set({
    shapes: state.shapes,
    edges: state.edges,
    selectedShapeId: undefined,
    selectedEdgeId: undefined,
  }),


}));
