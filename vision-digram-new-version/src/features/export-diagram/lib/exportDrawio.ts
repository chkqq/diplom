import type { Shape, Edge } from "../../../shared/types/diagram";
import { CELL } from "../../../shared/config/grid";

function shapeStyle(type: Shape["type"]): string {
  if (type === "circle") return "ellipse;whiteSpace=wrap;html=1;";
  if (type === "diamond") return "rhombus;whiteSpace=wrap;html=1;";
  return "rounded=1;whiteSpace=wrap;html=1;";
}

export function exportToDrawio(shapes: Shape[], edges: Edge[]): void {
  const shapeCells = shapes.map((s) => `
    <mxCell id="${s.id}" value="${s.text}" style="${shapeStyle(s.type)}" vertex="1" parent="1">
      <mxGeometry x="${s.x * CELL}" y="${s.y * CELL}" width="${s.w * CELL}" height="${s.h * CELL}" as="geometry"/>
    </mxCell>`).join("\n");

  const edgeCells = edges.map((e) => `
    <mxCell id="${e.id}" edge="1" source="${e.source}" target="${e.target}" parent="1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile>
  <diagram>
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${shapeCells}
        ${edgeCells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "diagram.drawio";
  a.click();
  URL.revokeObjectURL(url);
}
