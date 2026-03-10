import { useState, useCallback, useEffect, useRef } from "react";
import type { ShapeType } from "../../shared/types/diagram";
import type { ConnectState } from "../../features/connect-mode";

import { useDiagramStore } from "../../shared/store/diagramStore";
import { DEFAULT_TEXT_STYLE } from "../../shared/store/diagramStore";
import { startConnect, cancelConnect, selectSource } from "../../features/connect-mode";
import { exportToDrawio, importFromDrawio } from "../../features/export-diagram";
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
  const addEdge          = useDiagramStore((s) => s.addEdge);
  const updateEdge       = useDiagramStore((s) => s.updateEdge);
  const removeEdge       = useDiagramStore((s) => s.removeEdge);
  const batchUpdateShapes = useDiagramStore((s) => s.batchUpdateShapes);
  const loadDiagram      = useDiagramStore((s) => s.loadDiagram);
  const undo        = useDiagramStore((s) => s.undo);
  const redo        = useDiagramStore((s) => s.redo);
  const canUndo     = useDiagramStore((s) => s.past.length > 0);
  const canRedo     = useDiagramStore((s) => s.future.length > 0);

  const [selectedId,      setSelectedId]     = useState<string | null>(null);
  const [selectedIds,     setSelectedIds]    = useState<string[]>([]);
  const [selectedEdgeId,  setSelectedEdgeId] = useState<string | null>(null);
  const [connectFrom,  setConnectFrom] = useState<ConnectState>(null);
  const [showAI,       setShowAI]      = useState(false);
  const [pan,          setPan]         = useState({ x: 0, y: 0 });
  const [zoom,         setZoom]        = useState(1);
  // Placement mode: null = normal, ShapeType = waiting for canvas click
  const [pendingType,  setPendingType] = useState<ShapeType | null>(null);

  // Text format toolbar state
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { shapes, edges } = importFromDrawio(ev.target?.result as string);
        loadDiagram(shapes, edges);
      } catch {
        alert("Не удалось открыть файл. Убедитесь, что это корректный .drawio файл.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [loadDiagram]);

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
    if (selectedIds.length > 0) {
      selectedIds.forEach((id) => removeShape(id));
      setSelectedIds([]);
    } else if (selectedId) {
      removeShape(selectedId);
      setSelectedId(null);
    } else if (selectedEdgeId) {
      removeEdge(selectedEdgeId);
      setSelectedEdgeId(null);
    }
  }, [selectedIds, selectedId, selectedEdgeId, removeShape, removeEdge]);

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
      if (e.ctrlKey && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        redo();
      } else if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDelete, undo, redo]);

  const handleToggleConnect = () => {
    setPendingType(null);
    setSelectedId(null);
    setSelectedIds([]);
    setConnectFrom((c) => (c ? cancelConnect() : startConnect()));
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".drawio,.xml"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Toolbar
        connectFrom={connectFrom}
        selectedId={selectedIds.length > 0 ? selectedIds[0] : (selectedId ?? selectedEdgeId)}
        showAI={showAI}
        pendingType={pendingType} canUndo={canUndo} canRedo={canRedo}
        onAddShape={handleAddShape} onToggleConnect={handleToggleConnect}
        onDelete={handleDelete} onUndo={undo} onRedo={redo}
        onToggleAI={() => setShowAI((v) => !v)}
        onExport={() => exportToDrawio(shapes, edges)}
        onImport={handleImport}
      />

      <DiagramCanvas
        shapes={shapes} edges={edges}
        selectedId={selectedId} selectedIds={selectedIds} selectedEdgeId={selectedEdgeId}
        connectFrom={connectFrom} pan={pan} zoom={zoom}
        pendingType={pendingType}
        onSelectShape={(id) => { setSelectedId(id); setSelectedIds([]); setSelectedEdgeId(null); }}
        onSelectMultiple={(ids) => { setSelectedIds(ids); setSelectedId(null); setSelectedEdgeId(null); }}
        onSelectEdge={(id) => { setSelectedEdgeId(id); setSelectedId(null); setSelectedIds([]); }}
        onMoveShape={(id, x, y) => updateShape(id, { x, y })}
        onMoveMultiple={(updates) => batchUpdateShapes(updates.map(({ id, x, y }) => ({ id, props: { x, y } })))}
        onUpdateShape={(id, props) => updateShape(id, props)}
        onResizeShape={(id, x, y, w, h) => updateShape(id, { x, y, w, h })}
        onRotateShape={(id, rotation) => updateShape(id, { rotation })}
        onConnectPort={handleConnectPort}
        onUpdateEdge={updateEdge}
        onPanChange={setPan}
        onZoomChange={(newZoom, newPan) => { setZoom(newZoom); setPan(newPan); }}
        onCursorMove={() => {}}
        onPlaceShape={handlePlaceShape}
        onDeselect={() => { setSelectedId(null); setSelectedIds([]); setSelectedEdgeId(null); setConnectFrom(null); }}
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />

      <StatusBar
        shapeCount={shapes.length}
        edgeCount={edges.length}
        zoom={zoom}
        selectedId={selectedId}
        selectedIds={selectedIds}
        selectedShape={selectedId ? shapes.find((s) => s.id === selectedId) : undefined}
        selectedEdge={selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : undefined}
        connectFrom={connectFrom}
        pendingType={pendingType}
      />

      {showAI && <AIPanel onLoad={loadDiagram} onClose={() => setShowAI(false)} />}
    </div>
  );
}
