import { useState, useCallback, useEffect } from "react";
import type { ShapeType } from "../../shared/types/diagram";
import type { ConnectState } from "../../features/connect-mode";

import { useDiagramStore } from "../../shared/store/diagramStore";
import { DEFAULT_TEXT_STYLE } from "../../shared/store/diagramStore";
import { startConnect, cancelConnect, selectSource } from "../../features/connect-mode";
import { exportToDrawio } from "../../features/export-diagram";
import { AIPanel } from "../../features/ai-assistant";
import { Toolbar } from "../../widgets/toolbar";
import { DiagramCanvas } from "../../widgets/canvas";
import { StatusBar } from "../../widgets/status-bar";

function defaultShapeProps(type: ShapeType) {
  const base = {
    type,
    x: 0,
    y: 0,
    rotation: 0,
    items: [] as string[],
    rows: 3, cols: 3,
    cells: [] as string[][],
    textStyle: DEFAULT_TEXT_STYLE,
  };
  switch (type) {
    case "list":   return { ...base, w: 5, h: 6, text: "List", items: ["Item 1", "Item 2", "Item 3"] };
    case "table":  return { ...base, w: 7, h: 5, text: "Table", rows: 3, cols: 3,
      cells: [["Value 1","Value 2","Value 3"],["Value 4","Value 5","Value 6"],["Value 7","Value 8","Value 9"]] };
    case "circle":  return { ...base, w: 4, h: 4, text: "circle" };
    case "diamond": return { ...base, w: 5, h: 3, text: "diamond" };
    default:        return { ...base, w: 4, h: 2, text: type };
  }
}

export function EditorPage() {
  const shapes      = useDiagramStore((s) => s.shapes);
  const edges       = useDiagramStore((s) => s.edges);
  const addShape    = useDiagramStore((s) => s.addShape);
  const updateShape = useDiagramStore((s) => s.updateShape);
  const removeShape = useDiagramStore((s) => s.removeShape);
  const addEdge     = useDiagramStore((s) => s.addEdge);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);

  const [selectedId,   setSelectedId]  = useState<string | null>(null);
  const [connectFrom,  setConnectFrom] = useState<ConnectState>(null);
  const [showAI,       setShowAI]      = useState(false);
  const [pan,          setPan]         = useState({ x: 0, y: 0 });
  const [zoom,         setZoom]        = useState(1);
  // Placement mode: null = normal, ShapeType = waiting for canvas click
  const [pendingType,  setPendingType] = useState<ShapeType | null>(null);

  // Text format toolbar state
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);

  const handleEditStart = useCallback((shapeId: string, anchor: { x: number; y: number }) => {
    setEditingShapeId(shapeId);
    void anchor; // anchor available for future format-toolbar use
  }, []);

  const handleEditEnd = useCallback(() => {
    setEditingShapeId(null);
    void editingShapeId;
  }, [editingShapeId]);

  /** Toggle placement mode: click same type again → cancel */
  const handleAddShape = (type: ShapeType) => {
    setPendingType((cur) => (cur === type ? null : type));
    setConnectFrom(null);
  };

  /** Called by DiagramCanvas when user clicks on canvas in placement mode */
  const handlePlaceShape = useCallback((gridX: number, gridY: number) => {
    if (!pendingType) return;
    addShape({ ...defaultShapeProps(pendingType), x: gridX, y: gridY });
    setPendingType(null);
  }, [pendingType, addShape]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    removeShape(selectedId);
    setSelectedId(null);
  }, [selectedId, removeShape]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingType(null);
        setConnectFrom(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) {
        handleDelete();
      }
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setZoom((z) => Math.min(4, +(z * 1.2).toFixed(3)));
      }
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(0.2, +(z / 1.2).toFixed(3)));
      }
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDelete]);

  const handleToggleConnect = () => {
    setPendingType(null);
    setConnectFrom((c) => c ? cancelConnect() : startConnect());
  };

  const handleConnectPort = (id: string) => {
    if (!connectFrom || connectFrom === "pick") setConnectFrom(selectSource(id));
    else if (connectFrom !== id) { addEdge(connectFrom, id); setConnectFrom(null); }
    else setConnectFrom(null);
  };

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#030712",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');`}</style>

      <Toolbar
        connectFrom={connectFrom} selectedId={selectedId} showAI={showAI}
        pendingType={pendingType}
        onAddShape={handleAddShape} onToggleConnect={handleToggleConnect}
        onDelete={handleDelete} onToggleAI={() => setShowAI((v) => !v)}
        onExport={() => exportToDrawio(shapes, edges)}
      />

      <DiagramCanvas
        shapes={shapes} edges={edges}
        selectedId={selectedId} connectFrom={connectFrom} pan={pan} zoom={zoom}
        pendingType={pendingType}
        onSelectShape={setSelectedId}
        onMoveShape={(id, x, y) => updateShape(id, { x, y })}
        onUpdateShape={(id, props) => updateShape(id, props)}
        onResizeShape={(id, x, y, w, h) => updateShape(id, { x, y, w, h })}
        onRotateShape={(id, rotation) => updateShape(id, { rotation })}
        onConnectPort={handleConnectPort}
        onPanChange={setPan}
        onZoomChange={(newZoom, newPan) => { setZoom(newZoom); setPan(newPan); }}
        onCursorMove={() => {}}
        onPlaceShape={handlePlaceShape}
        onDeselect={() => { setSelectedId(null); setConnectFrom(null); }}
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />

      <StatusBar shapeCount={shapes.length} edgeCount={edges.length} selectedId={selectedId} />

      {showAI && <AIPanel onLoad={loadDiagram} onClose={() => setShowAI(false)} />}
    </div>
  );
}
