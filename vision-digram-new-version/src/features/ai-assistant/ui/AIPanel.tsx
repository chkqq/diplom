import { useState } from "react";
import type { Shape, Edge } from "../../../shared/store/diagramStore";
import type { ChatMessage } from "../model/chatModel";
import { generateDiagram } from "../api/generateDiagram";
import { userMessage, aiMessage } from "../model/chatModel";
import { v4 as uuid } from "uuid";
import type { ShapeType } from "../../../shared/types/diagram";

interface AIPanelProps {
  onLoad: (shapes: Shape[], edges: Edge[]) => void;
  onClose: () => void;
}

export function AIPanel({ onLoad, onClose }: AIPanelProps) {
  const [prompt, setPrompt]   = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);

  const send = async () => {
    if (!prompt.trim()) return;
    const msg = prompt.trim();
    setPrompt("");
    setHistory((h) => [...h, userMessage(msg)]);
    setLoading(true);
    try {
      const data = await generateDiagram(msg);

      // Server already returns grid-cell coordinates — just map to store Shape format
      const VALID: ShapeType[] = ["rectangle", "circle", "diamond", "list", "table"];
      const shapes: Shape[] = (data.shapes ?? []).map((s: any) => {
        const type: ShapeType = VALID.includes(s.type) ? s.type : "rectangle";
        const shape: Shape = {
          id:       s.id || uuid(),
          type,
          x:        Math.max(0, Math.round(s.x ?? 2)),
          y:        Math.max(0, Math.round(s.y ?? 2)),
          w:        Math.max(2, Math.round(s.w ?? 4)),
          h:        Math.max(1, Math.round(s.h ?? 2)),
          text:     s.text ?? "",
          rotation: s.rotation ?? 0,
          items:    [],
          rows:     2,
          cols:     2,
          cells:    [["", ""], ["", ""]],
          textStyle: { fontFamily: "JetBrains Mono", fontSize: 12, bold: false, italic: false, underline: false, strikethrough: false, align: "center", color: "#d1fae5", lineHeight: 1.2 },
        };
        if (type === "list") {
          shape.items = Array.isArray(s.items) ? s.items.map(String) : [];
        }
        if (type === "table") {
          shape.rows  = Math.max(1, s.rows ?? 2);
          shape.cols  = Math.max(1, s.cols ?? 2);
          shape.cells = Array.from({ length: shape.rows }, (_, r) =>
            Array.from({ length: shape.cols! }, (_, c) =>
              Array.isArray(s.cells) && Array.isArray(s.cells[r]) ? String(s.cells[r][c] ?? "") : ""
            )
          );
        }
        return shape;
      });

      const edges: Edge[] = (data.edges ?? []).map((e: any) => ({
        id:     e.id || uuid(),
        source: e.source,
        target: e.target,
      }));

      setHistory((h) => [...h, aiMessage("✅ Diagram generated!")]);
      onLoad(shapes, edges);
    } catch (e: any) {
      setHistory((h) => [...h, aiMessage("❌ " + (e.message || "Error"))]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", right: 16, bottom: 16, width: 340,
      background: "#0f172a", border: "1px solid #1e3a2f", borderRadius: 12,
      boxShadow: "0 0 40px #00000088", display: "flex", flexDirection: "column",
      fontFamily: "'JetBrains Mono', monospace", zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e3a2f", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
        <span style={{ color: "#6ee7b7", fontSize: 12, fontWeight: 700 }}>AI ASSISTANT · llama3.1</span>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, maxHeight: 240, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {history.length === 0 && (
          <p style={{ color: "#374151", fontSize: 11, textAlign: "center", marginTop: 16 }}>
            Describe a diagram and AI will create it
          </p>
        )}
        {history.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "#064e3b" : "#1e293b",
            color: m.role === "user" ? "#d1fae5" : "#94a3b8",
            borderRadius: 8, padding: "6px 10px", fontSize: 11, maxWidth: "85%",
          }}>
            {m.text}
          </div>
        ))}
        {loading && <div style={{ alignSelf: "flex-start", color: "#10b981", fontSize: 11 }}>⏳ Generating...</div>}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #1e3a2f", display: "flex", gap: 8 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Опишите диаграмму..."
          style={{
            flex: 1, background: "#1e293b", border: "1px solid #374151",
            borderRadius: 8, padding: "7px 10px", color: "#e5e7eb",
            fontSize: 11, outline: "none", fontFamily: "inherit",
          }}
        />
        <button onClick={send} disabled={loading} style={{
          background: loading ? "#064e3b" : "#10b981", border: "none",
          borderRadius: 8, padding: "7px 12px", color: "#fff",
          cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700,
        }}>→</button>
      </div>
    </div>
  );
}
