import express, { Request, Response } from "express";
import cors from "cors";
import { Ollama } from "ollama";
import { randomUUID } from "crypto";

// ─── Types (mirrored from frontend shared/types/diagram.ts) ──────────────────

type ShapeType = "rectangle" | "circle" | "diamond" | "list" | "table";
type ArrowType  = "line" | "filled" | "empty" | "source" | "both";
type ActionType = "replace" | "add" | "update" | "remove" | "analyze";

const VALID_ARROW_TYPES: ArrowType[] = ["line", "filled", "empty", "source", "both"];
const VALID_ACTION_TYPES: ActionType[] = ["replace", "add", "update", "remove", "analyze"];

interface Shape {
  id: string;
  type: ShapeType;
  x: number;       // grid cells (1–70)
  y: number;       // grid cells (1–50)
  w: number;       // grid cells (min 2)
  h: number;       // grid cells (min 1)
  text: string;
  rotation?: number;
  // list-specific
  items?: string[];
  // table-specific
  rows?: number;
  cols?: number;
  cells?: string[][];  // [row][col]
}

interface Edge {
  id: string;
  source: string;
  target: string;
  arrowType?: ArrowType;
}

interface Diagram {
  shapes: Shape[];
  edges: Edge[];
}

interface DiagramAction {
  action: ActionType;
  message: string;
  shapes?: Shape[];      // for replace / add / update
  edges?: Edge[];        // for replace / add
  shapeIds?: string[];   // for remove
  edgeIds?: string[];    // for remove
}

interface GenerateDiagramRequest {
  prompt: string;
  model?: string;
  context?: {
    shapes: Shape[];
    edges: Edge[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TYPES: ShapeType[] = ["rectangle", "circle", "diamond", "list", "table"];
const GRID_COLS = 80;
const GRID_ROWS = 60;

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
});

async function checkOllamaConnection(): Promise<void> {
  try {
    const { models } = await ollama.list();
    const names = models.map((m) => m.name).join(", ") || "none";
    console.log(`✅ Ollama connected. Available models: ${names}`);
  } catch (e) {
    console.error("❌ Cannot connect to Ollama:", (e as Error).message);
    console.error("   Make sure Ollama is running: ollama serve");
  }
}

checkOllamaConnection();

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Health check */
app.get("/health", (_req, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** List available Ollama models */
app.get("/models", async (_req, res: Response) => {
  try {
    const { models } = await ollama.list();
    res.json({ models: models.map((m) => m.name) });
  } catch (e) {
    res.status(503).json({ error: "Ollama unavailable", details: (e as Error).message });
  }
});

/** Generate or update diagram */
app.post(
  "/generate-diagram",
  async (req: Request<object, object, GenerateDiagramRequest>, res: Response) => {
    const { prompt, model = "llama3.1", context } = req.body;

    if (!prompt?.trim()) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const hasContext = context && (context.shapes?.length > 0 || context.edges?.length > 0);

    const shapeTypeDocs = `Available shape types:
- "rectangle" — general block. Required: x, y, w(≥2), h(≥1), text.
- "circle"    — oval/node.   Required: x, y, w(≥2), h(≥2), text.
- "diamond"   — decision.    Required: x, y, w(≥3), h(≥2), text.
- "list"      — bulleted list. Required: x, y, w(≥4), h(≥2), text (title), items (string[]).
- "table"     — data table.  Required: x, y, w(≥cols*2), h(≥rows+1), text (title), rows (int), cols (int), cells (string[rows][cols]).`;

    const arrowTypeDocs = `Edge arrowType values (optional, default "filled"):
- "filled"  — solid filled arrowhead at target (directed flow, calls).
- "empty"   — hollow arrowhead (inheritance, generalization).
- "source"  — arrowhead at source only (events, triggers).
- "both"    — arrowheads at both ends (bidirectional).
- "line"    — plain line, no arrowheads (associations).`;

    let systemPrompt: string;

    if (hasContext) {
      const contextJson = JSON.stringify(context, null, 2);
      systemPrompt = `You are a diagram editor assistant. Output ONLY valid JSON — no markdown, no explanations.

Grid size: ${GRID_COLS} columns × ${GRID_ROWS} rows. All coordinates and sizes are in grid units.

${shapeTypeDocs}

${arrowTypeDocs}

CURRENT DIAGRAM STATE (shapes and edges already on the board):
${contextJson}

You must choose ONE of these actions based on what the user asks:
- "replace" — Replace the entire diagram with completely new content.
- "add"     — Add new shapes/edges to the existing diagram. Do NOT include existing shapes in the response.
- "update"  — Modify properties of existing shapes. Reference their exact IDs from the current state. Only include changed fields + id.
- "remove"  — Delete shapes/edges by their IDs.
- "analyze" — Describe what's on the board without making any changes.

Response JSON schema:
{
  "action": "add",
  "message": "Short human-readable description of what was done",
  "shapes": [ ...new or updated shapes... ],
  "edges":  [ ...new edges... ],
  "shapeIds": [ "id1", "id2" ],
  "edgeIds":  [ "eid1" ]
}

Rules:
- Always set "action" and "message".
- For "add": provide only NEW shapes/edges with NEW unique IDs (prefix with "new_"). Keep x in 2–${GRID_COLS - 12}, y in 2–${GRID_ROWS - 12}. Avoid overlapping with existing shapes.
- For "update": "shapes" array contains objects with "id" (existing ID) + only the fields that change.
- For "remove": "shapeIds" lists IDs to delete (edges connected to those shapes will be cleaned up). "edgeIds" for edges only.
- For "replace": provide full new diagram in "shapes" and "edges". Ignore existing IDs.
- For "analyze": only set "message", omit shapes/edges/shapeIds/edgeIds.
- Space shapes ≥ 2 cells apart so they do not overlap.
- Always set arrowType on every new edge.`;
    } else {
      systemPrompt = `You are a diagram generator. Output ONLY valid JSON — no markdown, no explanations.

Grid size: ${GRID_COLS} columns × ${GRID_ROWS} rows. All coordinates and sizes are in grid units.

${shapeTypeDocs}

${arrowTypeDocs}

JSON schema:
{
  "action": "replace",
  "message": "Created diagram: <short description>",
  "shapes": [
    { "id": "s1", "type": "rectangle", "x": 5, "y": 5, "w": 6, "h": 2, "text": "Label" },
    { "id": "s2", "type": "list", "x": 15, "y": 5, "w": 6, "h": 4, "text": "My List", "items": ["Item 1", "Item 2"] },
    { "id": "s3", "type": "table", "x": 25, "y": 5, "w": 8, "h": 4, "text": "Table", "rows": 2, "cols": 3, "cells": [["A","B","C"],["D","E","F"]] }
  ],
  "edges": [
    { "id": "e1", "source": "s1", "target": "s2", "arrowType": "filled" }
  ]
}

Rules:
- Keep x in 2–${GRID_COLS - 12}, y in 2–${GRID_ROWS - 12}.
- Space shapes ≥ 2 cells apart so they do not overlap.
- Always set arrowType on every edge.
- For list/table types, always include all required extra fields.`;
    }

    const userPrompt = hasContext
      ? `User request: "${prompt.trim()}"`
      : `Create a diagram: "${prompt.trim()}"`;

    try {
      const response = await ollama.chat({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        format: "json",
        stream: false,
        options: { temperature: 0.5, top_p: 0.9 },
      });

      const raw = response.message.content;
      const action = normalizeAction(parseAction(raw, prompt.trim()));
      res.json(action);
    } catch (err) {
      console.error("Error generating diagram:", err);
      res.status(500).json({
        error: "Failed to generate diagram",
        details: (err as Error).message,
      });
    }
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAction(raw: string, prompt: string): DiagramAction {
  try {
    return JSON.parse(raw) as DiagramAction;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as DiagramAction;
      } catch {
        /* fall through */
      }
    }
    console.warn("Failed to parse AI output, using fallback. Raw:", raw);
    return {
      action: "replace",
      message: "Generated diagram",
      ...getFallback(prompt),
    };
  }
}

function normalizeAction(d: DiagramAction): DiagramAction {
  const action: ActionType = VALID_ACTION_TYPES.includes(d.action) ? d.action : "replace";
  const message = typeof d.message === "string" && d.message.trim() ? d.message.trim() : "Done";

  if (action === "analyze") {
    return { action, message };
  }

  if (action === "remove") {
    return {
      action,
      message,
      shapeIds: Array.isArray(d.shapeIds) ? d.shapeIds.map(String) : [],
      edgeIds:  Array.isArray(d.edgeIds)  ? d.edgeIds.map(String)  : [],
    };
  }

  if (action === "update") {
    const shapes = (d.shapes ?? []).map((s) => {
      const result: Partial<Shape> & { id: string } = { id: String(s.id) };
      if (s.type !== undefined && VALID_TYPES.includes(s.type)) result.type = s.type;
      if (s.x !== undefined)    result.x = Math.round(s.x);
      if (s.y !== undefined)    result.y = Math.round(s.y);
      if (s.w !== undefined)    result.w = Math.max(2, Math.round(s.w));
      if (s.h !== undefined)    result.h = Math.max(1, Math.round(s.h));
      if (s.text !== undefined) result.text = String(s.text);
      if (s.rotation !== undefined) result.rotation = s.rotation;
      if (Array.isArray(s.items)) result.items = s.items.map(String);
      if (s.rows !== undefined) result.rows = Math.max(1, s.rows);
      if (s.cols !== undefined) result.cols = Math.max(1, s.cols);
      if (Array.isArray(s.cells)) result.cells = s.cells;
      return result as Shape;
    });
    return { action, message, shapes };
  }

  // replace / add
  const shapes: Shape[] = (d.shapes ?? []).map((s, i) => normalizeShape(s, i));
  const edges: Edge[]   = (d.edges  ?? []).map((e) => normalizeEdge(e));

  return { action, message, shapes, edges };
}

function normalizeShape(s: Shape, i = 0): Shape {
  const type: ShapeType = VALID_TYPES.includes(s.type as ShapeType)
    ? (s.type as ShapeType)
    : "rectangle";

  const shape: Shape = {
    id:   s.id || randomUUID(),
    type,
    x:    clamp(Math.round(s.x ?? 2 + i * 8), 2, GRID_COLS - 12),
    y:    clamp(Math.round(s.y ?? 2),          2, GRID_ROWS - 12),
    w:    Math.max(2, Math.round(s.w ?? 4)),
    h:    Math.max(1, Math.round(s.h ?? 2)),
    text: String(s.text ?? ""),
  };

  if (s.rotation !== undefined) shape.rotation = s.rotation;

  if (type === "list") {
    shape.items = Array.isArray(s.items) ? s.items.map(String) : [];
    shape.h = Math.max(shape.h, shape.items.length + 1);
  }

  if (type === "table") {
    shape.rows  = Math.max(1, s.rows ?? 2);
    shape.cols  = Math.max(1, s.cols ?? 2);
    shape.cells = normalizeCells(s.cells, shape.rows, shape.cols);
    shape.w     = Math.max(shape.w, shape.cols * 2);
    shape.h     = Math.max(shape.h, shape.rows + 1);
  }

  return shape;
}

function normalizeEdge(e: Edge): Edge {
  const arrowType: ArrowType = VALID_ARROW_TYPES.includes(e.arrowType as ArrowType)
    ? (e.arrowType as ArrowType)
    : "filled";
  return {
    id:        e.id || randomUUID(),
    source:    e.source,
    target:    e.target,
    arrowType,
  };
}

function normalizeCells(cells: unknown, rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      if (Array.isArray(cells) && Array.isArray(cells[r])) {
        return String((cells[r] as unknown[])[c] ?? "");
      }
      return "";
    })
  );
}

function getFallback(prompt: string): Diagram {
  return {
    shapes: [
      {
        id:   randomUUID(),
        type: "rectangle",
        x:    5,
        y:    5,
        w:    6,
        h:    2,
        text: prompt.split(" ").slice(0, 3).join(" ") || "Block",
      },
    ],
    edges: [],
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 5000);
app.listen(PORT, () =>
  console.log(`✅ Vision Diagram Server running on http://localhost:${PORT}`)
);
