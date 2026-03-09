import { useState, useCallback, useEffect } from "react";
import type { ShapeType } from "../../shared/types/diagram";
import type { ConnectState } from "../../features/connect-mode";

import { useDiagramStore } from "../../shared/store/diagramStore";
import { startConnect, cancelConnect, selectSource } from "../../features/connect-mode";
import { exportToDrawio } from "../../features/export-diagram";
import { AIPanel } from "../../features/ai-assistant";
import { Toolbar } from "../../widgets/toolbar";
import { DiagramCanvas } from "../../widgets/canvas";
import { StatusBar } from "../../widgets/status-bar";

export function EditorPage() {
  // ── Zustand store ──
  const shapes      = useDiagramStore((s) => s.shapes);
  const edges       = useDiagramStore((s) => s.edges);
  const addShape    = useDiagramStore((s) => s.addShape);
  const updateShape = useDiagramStore((s) => s.updateShape);
  const removeShape = useDiagramStore((s) => s.removeShape);
  const addEdge     = useDiagramStore((s) => s.addEdge);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);

  // ── Local UI state ──
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [connectFrom,  setConnectFrom]  = useState<ConnectState>(null);
  const [showAI,       setShowAI]       = useState(false);
  const [pan,          setPan]          = useState({ x: 0, y: 0 });

  // ── Shape actions ──
  const handleAddShape = (type: ShapeType) => {
    // addShape auto-generates id via uuid
    addShape({
      type,
      x: 3 + Math.floor(Math.random() * 5),
      y: 3 + Math.floor(Math.random() * 4),
      w: 4,
      h: 2,
      text: type,
    });
  };

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    removeShape(selectedId); // store also removes connected edges
    setSelectedId(null);
  }, [selectedId, removeShape]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) {
        handleDelete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDelete]);

  // ── Connect actions ──
  const handleToggleConnect = () => {
    setConnectFrom((c) => (c ? cancelConnect() : startConnect()));
  };

  const handleConnectPort = (id: string) => {
    if (!connectFrom || connectFrom === "pick") {
      setConnectFrom(selectSource(id));
    } else if (connectFrom !== id) {
      addEdge(connectFrom, id);
      setConnectFrom(null);
    } else {
      setConnectFrom(null);
    }
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
        onMoveShape={(id, x, y) => updateShape(id, { x, y })}
        onLabelChange={(id, text) => updateShape(id, { text })}
        onConnectPort={handleConnectPort}
        onPanChange={setPan}
        onDeselect={() => { setSelectedId(null); setConnectFrom(null); }}
      />

      <StatusBar
        shapeCount={shapes.length}
        edgeCount={edges.length}
        selectedId={selectedId}
      />

      {showAI && (
        <AIPanel
          onLoad={loadDiagram}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  );
}
