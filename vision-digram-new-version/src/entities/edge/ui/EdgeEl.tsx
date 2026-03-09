import type { Edge, Shape } from "../../../shared/store/diagramStore";
import { buildEdgePath } from "../../../shared/lib";

interface EdgeElProps {
  edge: Edge;
  shapes: Shape[];
}

export function EdgeEl({ edge, shapes }: EdgeElProps) {
  const a = shapes.find((s) => s.id === edge.source);
  const b = shapes.find((s) => s.id === edge.target);
  if (!a || !b) return null;

  return (
    <path
      d={buildEdgePath(a, b)}
      stroke="#10b981"
      strokeWidth={1.5}
      fill="none"
      markerEnd="url(#arrow)"
      opacity={0.8}
    />
  );
}
