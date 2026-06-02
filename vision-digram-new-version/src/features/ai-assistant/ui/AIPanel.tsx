import { useState, useRef, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { DEFAULT_TEXT_STYLE, useDiagramStore } from "../../../shared/store/diagramStore";
import type { Shape, Edge } from "../../../shared/store/diagramStore";
import type { ChatMessage } from "../model/chatModel";
import { generateDiagram } from "../api/generateDiagram";
import { userMessage, aiMessage } from "../model/chatModel";
import type { ShapeType } from "../../../shared/types/diagram";
import { useTheme } from "../../../shared/theme";

interface AIPanelProps {
  onClose: () => void;
}

const VALID: ShapeType[] = ["rectangle", "circle", "diamond", "list", "table"];

function normalizeShape(s: any): Shape {
  const type: ShapeType = VALID.includes(s.type) ? s.type : "rectangle";
  const shape: Shape = {
    id:        s.id || uuid(),
    type,
    x:         Math.max(0, Math.round(s.x ?? 2)),
    y:         Math.max(0, Math.round(s.y ?? 2)),
    w:         Math.max(2, Math.round(s.w ?? 4)),
    h:         Math.max(1, Math.round(s.h ?? 2)),
    text:      s.text ?? "",
    rotation:  s.rotation ?? 0,
    items:     [],
    rows:      2,
    cols:      2,
    cells:     [["", ""], ["", ""]],
    textStyle: {
      fontFamily: "JetBrains Mono", fontSize: 12, bold: false, italic: false,
      underline: false, strikethrough: false, align: "center",
      color: DEFAULT_TEXT_STYLE.color, lineHeight: 1.2,
    },
  };
  if (type === "list") {
    shape.items = Array.isArray(s.items) ? s.items.map(String) : [];
  }
  if (type === "table") {
    shape.rows  = Math.max(1, s.rows ?? 2);
    shape.cols  = Math.max(1, s.cols ?? 2);
    shape.cells = Array.from({ length: shape.rows }, (_, r) =>
      Array.from({ length: shape.cols! }, (_, c) =>
        Array.isArray(s.cells) && Array.isArray(s.cells[r])
          ? String(s.cells[r][c] ?? "")
          : ""
      )
    );
  }
  return shape;
}

export function AIPanel({ onClose }: AIPanelProps) {
  const theme = useTheme();
  const shapes           = useDiagramStore((s) => s.shapes);
  const edges            = useDiagramStore((s) => s.edges);
  const loadDiagram      = useDiagramStore((s) => s.loadDiagram);
  const batchUpdateShapes = useDiagramStore((s) => s.batchUpdateShapes);
  const removeShape      = useDiagramStore((s) => s.removeShape);
  const removeEdge       = useDiagramStore((s) => s.removeEdge);
  const undo             = useDiagramStore((s) => s.undo);
  const redo             = useDiagramStore((s) => s.redo);
  const canUndo          = useDiagramStore((s) => s.past.length > 0);
  const canRedo          = useDiagramStore((s) => s.future.length > 0);

  const [prompt, setPrompt]   = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const UNDO_RE = /\b(undo|отмени|верни|назад|put.*(back|prev)|как было|restore)\b/i;
  const REDO_RE = /\b(redo|повтори|вперёд|вперед)\b/i;

  const send = async () => {
    if (!prompt.trim()) return;
    const msg = prompt.trim();
    setPrompt("");
    setHistory((h) => [...h, userMessage(msg)]);

    if (UNDO_RE.test(msg)) {
      if (canUndo) { undo(); setHistory((h) => [...h, aiMessage("↩ Отменено")]); }
      else setHistory((h) => [...h, aiMessage("❌ Нечего отменять")]);
      return;
    }
    if (REDO_RE.test(msg)) {
      if (canRedo) { redo(); setHistory((h) => [...h, aiMessage("↪ Повторено")]); }
      else setHistory((h) => [...h, aiMessage("❌ Нечего повторять")]);
      return;
    }

    setLoading(true);

    try {
      const hasBoard = shapes.length > 0 || edges.length > 0;
      const context = hasBoard ? { shapes, edges } : undefined;
      const data = await generateDiagram(msg, context);

      switch (data.action) {
        case "replace": {
          const newShapes = (data.shapes ?? []).map(normalizeShape);
          const newEdges: Edge[] = (data.edges ?? []).map((e: any) => ({
            id: e.id || uuid(), source: e.source, target: e.target, arrowType: e.arrowType,
          }));
          loadDiagram(newShapes, newEdges);
          break;
        }

        case "add": {
          const existingIds = new Set(shapes.map((s) => s.id));
          const idMap: Record<string, string> = {};

          const newShapes = (data.shapes ?? []).map((s: any) => {
            const assignedId = s.id && !existingIds.has(s.id) ? s.id : uuid();
            idMap[s.id ?? ""] = assignedId;
            return normalizeShape({ ...s, id: assignedId });
          });

          const newEdges: Edge[] = (data.edges ?? []).map((e: any) => ({
            id:        uuid(),
            source:    idMap[e.source] ?? e.source,
            target:    idMap[e.target] ?? e.target,
            arrowType: e.arrowType,
          }));

          loadDiagram([...shapes, ...newShapes], [...edges, ...newEdges]);
          break;
        }

        case "update": {
          const updates = (data.shapes ?? []).map((s: any) => ({
            id:    String(s.id),
            props: s as Partial<Omit<Shape, "id">>,
          }));
          if (updates.length > 0) batchUpdateShapes(updates);
          break;
        }

        case "remove": {
          (data.shapeIds ?? []).forEach((id) => removeShape(id));
          (data.edgeIds  ?? []).forEach((id) => removeEdge(id));
          break;
        }

        case "analyze":
          // no board changes, just show the message
          break;

        default:
          break;
      }

      setHistory((h) => [...h, aiMessage(data.message || "✅ Done")]);
    } catch (e: any) {
      setHistory((h) => [...h, aiMessage("❌ " + (e.message || "Error"))]);
    } finally {
      setLoading(false);
    }
  };

  const boardInfo = shapes.length > 0
    ? `${shapes.length} shape${shapes.length !== 1 ? "s" : ""}${edges.length > 0 ? `, ${edges.length} edge${edges.length !== 1 ? "s" : ""}` : ""} on board`
    : "Board is empty";

  return (
    <div style={{
      position: "fixed", right: 16, bottom: 44, width: 340,
      background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 12,
      boxShadow: theme.panelShadow, display: "flex", flexDirection: "column",
      fontFamily: "'JetBrains Mono', monospace", zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 6px ${theme.accentGlow}` }} />
        <span style={{ color: theme.accentBright, fontSize: 12, fontWeight: 700 }}>AI ASSISTANT · llama3.1</span>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: theme.textSubtle, cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {/* Board context indicator */}
      <div style={{ padding: "5px 14px", background: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ color: shapes.length > 0 ? theme.accentText : theme.textGhost, fontSize: 10 }}>
          ● {boardInfo} — AI can see and edit it
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, maxHeight: 240, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {history.length === 0 && (
          <p style={{ color: theme.textGhost, fontSize: 11, textAlign: "center", marginTop: 16 }}>
            {shapes.length > 0
              ? 'Board has content. Try "add a database node", "remove all rectangles", "what\'s on the board?"'
              : "Describe a diagram and AI will create it"}
          </p>
        )}
        {history.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? theme.accentSoft : theme.surfaceRaised,
            color: m.role === "user" ? theme.accentText : theme.textMuted,
            borderRadius: 8, padding: "6px 10px", fontSize: 11, maxWidth: "85%",
          }}>
            {m.text}
          </div>
        ))}
        {loading && <div style={{ alignSelf: "flex-start", color: theme.accentText, fontSize: 11 }}>⏳ Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${theme.border}`, display: "flex", gap: 8 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send()}
          placeholder={shapes.length > 0 ? "Add, edit, remove, analyze..." : "Describe the diagram..."}
          style={{
            flex: 1, background: theme.inputBg, border: `1px solid ${theme.borderMuted}`,
            borderRadius: 8, padding: "7px 10px", color: theme.text,
            fontSize: 11, outline: "none", fontFamily: "inherit",
          }}
        />
        <button onClick={send} disabled={loading} style={{
          background: loading ? theme.accentSoft : theme.accent, border: "none",
          borderRadius: 8, padding: "7px 12px", color: theme.onAccentText,
          cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700,
        }}>→</button>
      </div>
    </div>
  );
}
