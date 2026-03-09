import { useState, useCallback, useEffect } from "react";

// shared
import type { Shape, Edge, Diagram, ShapeType } from "../../shared/types/diagram";
import { uid } from "../../shared/lib";
import { CELL } from "../../shared/config/grid";

// entities
import { createShape, updateShapeLabel, moveShape, removeShape } from "../../entities/shape";
import { createEdge, removeEdgesForShape } from "../../entities/edge";

// features
import type { ConnectState } from "../../features/connect-mode";
import { startConnect, cancelConnect, selectSource } from "../../features/connect-mode";
import { exportToDrawio } from "../../features/export-diagram";
import { AIPanel } from "../../features/ai-assistant";

// widgets
import { Toolbar } from "../../widgets/toolbar";
import { DiagramCanvas } from "../../widgets/canvas";
import { StatusBar } from "../../widgets/status-bar";

export function EditorPage() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<ConnectState>(null);
  const [showAI, setShowAI] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // ── Shape actions ──
  const handleAddShape = (type: ShapeType) => {
    const shape = createShape(type);
    setShapes((s) => [...s, shape]);
    setSelectedId(shape.id);
  };

  const handleMoveShape = (id: string, x: number, y: number) => {
    setShapes((s) => moveShape(s, id, x, y));
  };

  const handleLabelChange = (id: string, text: string) => {
    setShapes((s) => updateShapeLabel(s, id, text));
  };

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    setShapes((s) => removeShape(s, selectedId));
    setEdges((e) => removeEdgesForShape(e, selectedId));
    setSelectedId(null);
  }, [selectedId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") handleDelete();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDelete]);

  // ── Connect actions ──
  const handleToggleConnect = () => {
    setConnectFrom((c) => (c ? cancelConnect() : startConnect()));
  };

  const handleConnectPort = (id: string) => {
    if (!connectFrom) {
      setConnectFrom(selectSource(id));
    } else if (connectFrom !== id && connectFrom !== "pick") {
      setEdges((e) => [...e, createEdge(connectFrom, id)]);
      setConnectFrom(null);
    } else if (connectFrom === "pick") {
      setConnectFrom(selectSource(id));
    } else {
      setConnectFrom(null);
    }
  };

  // ── AI load ──
  const handleLoadDiagram = (d: Diagram) => {
    const newShapes: Shape[] = (d.shapes || []).map((s: any) => ({
      id: s.id || uid(),
      type: (["circle", "diamond"].includes(s.type) ? s.type : "rectangle") as ShapeType,
      x: Math.max(0, Math.round((s.x ?? 0) / CELL)),
      y: Math.max(0, Math.round((s.y ?? 0) / CELL)),
      w: Math.max(2, Math.round((s.width ?? 128) / CELL)),
      h: Math.max(1, Math.round((s.height ?? 64) / CELL)),
      text: s.text || "",
    }));
    const newEdges: Edge[] = (d.edges || []).map((e: any) => ({
      id: e.id || uid(),
      source: e.source,
      target: e.target,
    }));
    setShapes(newShapes);
    setEdges(newEdges);
    setSelectedId(null);
  };

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#030712",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');`}</style>

      <Toolbar
        connectFrom={connectFrom}
        selectedId={selectedId}
        showAI={showAI}
        onAddShape={handleAddShape}
        onToggleConnect={handleToggleConnect}
        onDelete={handleDelete}
        onToggleAI={() => setShowAI((v) => !v)}
        onExport={() => exportToDrawio(shapes, edges)}
      />

      <DiagramCanvas
        shapes={shapes}
        edges={edges}
        selectedId={selectedId}
        connectFrom={connectFrom}
        pan={pan}
        onSelectShape={setSelectedId}
        onMoveShape={handleMoveShape}
        onLabelChange={handleLabelChange}
        onConnectPort={handleConnectPort}
        onPanChange={setPan}
        onDeselect={() => { setSelectedId(null); setConnectFrom(null); }}
      />

      <StatusBar
        shapeCount={shapes.length}
        edgeCount={edges.length}
        selectedId={selectedId}
      />

      {showAI && <AIPanel onDiagram={handleLoadDiagram} onClose={() => setShowAI(false)} />}
    </div>
  );
}
