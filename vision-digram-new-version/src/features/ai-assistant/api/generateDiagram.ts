import type { Shape, Edge } from "../../../shared/store/diagramStore";

const API_URL = "http://localhost:5000/generate-diagram";

export type ActionType = "replace" | "add" | "update" | "remove" | "analyze";

export interface DiagramAction {
  action: ActionType;
  message: string;
  shapes?: Shape[];
  edges?: Edge[];
  shapeIds?: string[];
  edgeIds?: string[];
}

export interface DiagramContext {
  shapes: Shape[];
  edges: Edge[];
}

export async function generateDiagram(
  prompt: string,
  context?: DiagramContext
): Promise<DiagramAction> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<DiagramAction>;
}
