import type { Edge } from "../../../shared/types/diagram";
import { uid } from "../../../shared/lib";

export function createEdge(source: string, target: string): Edge {
  return { id: uid(), source, target };
}

export function removeEdgesForShape(edges: Edge[], shapeId: string): Edge[] {
  return edges.filter((e) => e.source !== shapeId && e.target !== shapeId);
}
