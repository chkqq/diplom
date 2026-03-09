import type { Diagram } from "../../../shared/types/diagram";

const API_URL = "http://localhost:5000/generate-diagram";

export async function generateDiagram(prompt: string): Promise<Diagram> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<Diagram>;
}
