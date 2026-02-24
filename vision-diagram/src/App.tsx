import { Toolbar } from "./components/ToolBar";
import { Canvas } from "./components/Canvas";
import { useDiagramStore } from "./store/useDiagramStore";
import { serializeToMxGraph } from "./models/mxSerializer";
import { AiAssistant } from "./components/AiAssistant";
export default function App() {
  const state = useDiagramStore();

  const handleSave = () => {
    const xml = serializeToMxGraph({
      shapes: state.shapes,
      edges: state.edges,
    });

    const blob = new Blob([xml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.drawio";
    a.click();
  };

  return (
    <div className="h-screen flex flex-col">
      <Toolbar />
      <AiAssistant />
      <div className="flex justify-end p-2 border-b">
        <button
          onClick={handleSave}
          className="px-4 py-1 bg-green-500 text-white rounded"
        >
          Save XML
        </button>
      </div>

      <div className="flex-1">
        <Canvas />
      </div>
    </div>
  );
}
