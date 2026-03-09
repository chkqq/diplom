import { useState, useCallback, useEffect } from "react";
import type { ShapeType } from "../../shared/types/diagram";
import type { ConnectState } from "../../features/connect-mode";
import type { TextStyle } from "../../shared/store/diagramStore";

import { useDiagramStore } from "../../shared/store/diagramStore";
import { DEFAULT_TEXT_STYLE } from "../../shared/store/diagramStore";
import { startConnect, cancelConnect, selectSource } from "../../features/connect-mode";
import { exportToDrawio } from "../../features/export-diagram";
import { AIPanel } from "../../features/ai-assistant";
import { TextFormatToolbar } from "../../features/text-format/ui/TextFormatToolbar";
import { Toolbar } from "../../widgets/toolbar";
import { DiagramCanvas } from "../../widgets/canvas";
import { StatusBar } from "../../widgets/status-bar";

function defaultShapeProps(type: ShapeType) {
  const base = {
    type,
    x: 3 + Math.floor(Math.random() * 6),
    y: 3 + Math.floor(Math.random() * 4),
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

  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [connectFrom,  setConnectFrom]  = useState<ConnectState>(null);
  const [showAI,       setShowAI]       = useState(false);
  const [pan,          setPan]          = useState({ x: 0, y: 0 });

  // Text format toolbar state
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [toolbarAnchor,  setToolbarAnchor]  = useState<{ x: number; y: number } | null>(null);

  const handleEditStart = useCallback((shapeId: string, anchor: { x: number; y: number }) => {
    setEditingShapeId(shapeId);
    setToolbarAnchor(anchor);
  }, []);

  const handleEditEnd = useCallback(() => {
    setEditingShapeId(null);
    setToolbarAnchor(null);
  }, []);

  const handleTextStyleChange = useCallback((patch: Partial<TextStyle>) => {
    if (!editingShapeId) return;
    const shape = shapes.find((s) => s.id === editingShapeId);
    if (!shape) return;
    const merged = { ...DEFAULT_TEXT_STYLE, ...shape.textStyle, ...patch };
    updateShape(editingShapeId, { textStyle: merged });
  }, [editingShapeId, shapes, updateShape]);

  const editingShape = shapes.find((s) => s.id === editingShapeId);

  const handleAddShape = (type: ShapeType) => addShape(defaultShapeProps(type));

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    removeShape(selectedId);
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

  const handleToggleConnect = () => setConnectFrom((c) => c ? cancelConnect() : startConnect());

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
        onAddShape={handleAddShape} onToggleConnect={handleToggleConnect}
        onDelete={handleDelete} onToggleAI={() => setShowAI((v) => !v)}
        onExport={() => exportToDrawio(shapes, edges)}
      />

      <DiagramCanvas
        shapes={shapes} edges={edges}
        selectedId={selectedId} connectFrom={connectFrom} pan={pan}
        onSelectShape={setSelectedId}
        onMoveShape={(id, x, y) => updateShape(id, { x, y })}
        onUpdateShape={(id, props) => updateShape(id, props)}
        onResizeShape={(id, x, y, w, h) => updateShape(id, { x, y, w, h })}
        onRotateShape={(id, rotation) => updateShape(id, { rotation })}
        onConnectPort={handleConnectPort}
        onPanChange={setPan}
        onDeselect={() => { setSelectedId(null); setConnectFrom(null); }}
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />

      <StatusBar shapeCount={shapes.length} edgeCount={edges.length} selectedId={selectedId} />

      {/* Floating text format toolbar */}
      {editingShapeId && toolbarAnchor && editingShape && (
        <TextFormatToolbar
          anchorEl={toolbarAnchor}
          style={{ ...DEFAULT_TEXT_STYLE, ...editingShape.textStyle }}
          onChange={handleTextStyleChange}
          onClose={handleEditEnd}
        />
      )}

      {showAI && <AIPanel onLoad={loadDiagram} onClose={() => setShowAI(false)} />}
    </div>
  );
}
