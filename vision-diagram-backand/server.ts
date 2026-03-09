import express, { Request, Response } from "express";
import cors from "cors";
import { Ollama } from "ollama";
import { randomUUID } from "crypto";

// ─── Types (mirrored from frontend shared/types/diagram.ts) ──────────────────

type ShapeType = "rectangle" | "circle" | "diamond" | "list" | "table";

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
}

interface Diagram {
  shapes: Shape[];
  edges: Edge[];
}

interface GenerateDiagramRequest {
  prompt: string;
  model?: string;
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

/** Generate diagram from prompt */
app.post(
  "/generate-diagram",
  async (req: Request<object, object, GenerateDiagramRequest>, res: Response) => {
    const { prompt, model = "llama3.1" } = req.body;

    if (!prompt?.trim()) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const systemPrompt = `You are a diagram generator. Output ONLY valid JSON — no markdown, no explanations.

Grid size: ${GRID_COLS} columns × ${GRID_ROWS} rows. All coordinates and sizes are in grid units.

Available shape types and their properties:
- "rectangle" — general block. Required: x, y, w(≥2), h(≥1), text.
- "circle"    — oval/node.   Required: x, y, w(≥2), h(≥2), text.
- "diamond"   — decision.    Required: x, y, w(≥3), h(≥2), text.
- "list"      — bulleted list. Required: x, y, w(≥4), h(≥2), text (title), items (string[]).
- "table"     — data table.  Required: x, y, w(≥cols*2), h(≥rows+1), text (title),
                              rows (int), cols (int), cells (string[rows][cols]).

JSON schema:
{
  "shapes": [
    {
      "id": "s1",
      "type": "rectangle",
      "x": 5, "y": 5, "w": 6, "h": 2,
      "text": "Label"
    },
    {
      "id": "s2",
      "type": "list",
      "x": 15, "y": 5, "w": 6, "h": 4,
      "text": "My List",
      "items": ["Item 1", "Item 2", "Item 3"]
    },
    {
      "id": "s3",
      "type": "table",
      "x": 25, "y": 5, "w": 8, "h": 4,
      "text": "My Table",
      "rows": 2, "cols": 3,
      "cells": [["A1","B1","C1"],["A2","B2","C2"]]
    }
  ],
  "edges": [
    { "id": "e1", "source": "s1", "target": "s2" }
  ]
}

Rules:
- Keep x in 2–${GRID_COLS - 12}, y in 2–${GRID_ROWS - 12}.
- Space shapes ≥ 2 cells apart so they do not overlap.
- Choose the shape type that best fits the element's semantic role.
- For list/table types, always include all required extra fields.`;

    const userPrompt = `Create a diagram: "${prompt.trim()}"`;

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
      const diagram = normalizeDiagram(parseDiagram(raw, prompt));
      res.json(diagram);
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

function parseDiagram(raw: string, prompt: string): Diagram {
  try {
    return JSON.parse(raw) as Diagram;
  } catch {
    // Model sometimes wraps JSON in markdown code-fences
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Diagram;
      } catch {
        /* fall through */
      }
    }
    console.warn("Failed to parse AI output, using fallback. Raw:", raw);
    return getFallback(prompt);
  }
}

function normalizeDiagram(d: Diagram): Diagram {
  const shapes: Shape[] = (d.shapes ?? []).map((s, i) => {
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

    if (s.rotation !== undefined) {
      shape.rotation = s.rotation;
    }

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
  });

  const edges: Edge[] = (d.edges ?? []).map((e) => ({
    id:     e.id || randomUUID(),
    source: e.source,
    target: e.target,
  }));

  return { shapes, edges };
}

function normalizeCells(
  cells: unknown,
  rows: number,
  cols: number
): string[][] {
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
