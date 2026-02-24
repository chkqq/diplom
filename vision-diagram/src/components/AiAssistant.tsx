import { useState } from "react";
import { useDiagramStore } from "../store/useDiagramStore";

export const AiAssistant = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/generate-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      // ✅ Обновляем Zustand корректно
      useDiagramStore.setState({
        shapes: data.shapes,
        edges: data.edges,
        selectedShapeId: undefined,
        selectedEdgeId: undefined,
      });
    } catch (err) {
      console.error("Error generating diagram:", err);
    } finally {
      setLoading(false);
    }
    
  };

  return (
    <div className="p-2 border-b flex gap-2">
      <input
        type="text"
        placeholder="Describe your diagram..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="flex-1 p-1 border rounded"
      />
      <button
        onClick={handleGenerate}
        className="px-4 py-1 bg-purple-500 text-white rounded"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate"}
      </button>
    </div>
  );
};
