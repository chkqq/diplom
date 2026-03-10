import type { Edge, Shape } from "../../../shared/store/diagramStore";
import { buildEdgePath } from "../../../shared/lib";

interface EdgeElProps {
  edge: Edge;
  shapes: Shape[];
  selected?: boolean;
  onClick?: (id: string) => void;
}

function markers(arrowType: Edge["arrowType"], selected: boolean) {
  const sfx = selected ? "-sel" : "";
  switch (arrowType ?? "filled") {
    case "line":   return { end: undefined,                  start: undefined };
    case "filled": return { end: `url(#arr-filled${sfx})`,  start: undefined };
    case "empty":  return { end: `url(#arr-empty${sfx})`,   start: undefined };
    case "source": return { end: undefined,                  start: `url(#arr-start${sfx})` };
    case "both":   return { end: `url(#arr-filled${sfx})`,  start: `url(#arr-start${sfx})` };
  }
}

export function EdgeEl({ edge, shapes, selected = false, onClick }: EdgeElProps) {
  const a = shapes.find((s) => s.id === edge.source);
  const b = shapes.find((s) => s.id === edge.target);
  if (!a || !b) return null;

  const d = buildEdgePath(a, b);
  const { start, end } = markers(edge.arrowType, selected);

  return (
    <g style={{ cursor: "pointer" }} onClick={() => onClick?.(edge.id)}>
      <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
      <path
        d={d}
        stroke={selected ? "#f59e0b" : "#10b981"}
        strokeWidth={selected ? 2 : 1.5}
        fill="none"
        markerEnd={end}
        markerStart={start}
        opacity={selected ? 1 : 0.8}
      />
    </g>
  );
}
