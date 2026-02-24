import { useDiagramStore } from "../store/useDiagramStore";

export const Toolbar = () => {
  const { tool, setTool } = useDiagramStore();

  const btn = (value: any, label: string) => (
    <button
      onClick={() => setTool(value)}
      className={`px-3 py-1 rounded border ${
        tool === value ? "bg-blue-500 text-white" : "bg-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex gap-2 p-2 border-b bg-gray-50">
      {btn("select", "Select")}
      {btn("rectangle", "Rectangle")}
      {btn("ellipse", "Ellipse")}
      {btn("edge", "Edge")}
    </div>
  );
};
