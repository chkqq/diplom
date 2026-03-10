import type { Shape, Edge } from "../../../shared/store/diagramStore";
import { CELL } from "../../../shared/config/grid";

const LIST_HEADER_H = 28;
const LIST_ROW_H    = 28;

function escapeXml(str: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rotationStyle(rotation?: number): string {
  return rotation ? `rotation=${rotation};` : "";
}

function basicShapeStyle(type: Shape["type"]): string {
  if (type === "circle")  return "ellipse;whiteSpace=wrap;html=1;";
  if (type === "diamond") return "rhombus;whiteSpace=wrap;html=1;";
  return "rounded=1;whiteSpace=wrap;html=1;";
}

function buildBasicCell(s: Shape): string {
  const x = s.x * CELL;
  const y = s.y * CELL;
  const w = s.w * CELL;
  const h = s.h * CELL;
  const style = basicShapeStyle(s.type) + rotationStyle(s.rotation);
  return `
    <mxCell id="${s.id}" value="${escapeXml(s.text)}" style="${style}" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
    </mxCell>`;
}

function buildTableCell(s: Shape): string {
  const rows  = s.rows  ?? 3;
  const cols  = s.cols  ?? 3;
  const cells = s.cells ?? Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => `Value ${r * cols + c + 1}`)
  );

  const x    = s.x * CELL;
  const y    = s.y * CELL;
  const w    = s.w * CELL;
  const h    = s.h * CELL;
  const rowH = Math.max(20, Math.floor(h / rows));
  const colW = Math.floor(w / cols);

  let xml = `
    <mxCell id="${s.id}" value="${escapeXml(s.text)}" style="shape=table;startSize=${rowH};container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeLast=1;${rotationStyle(s.rotation)}" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
    </mxCell>`;

  cells.forEach((row, r) => {
    const rowId = `${s.id}-r${r}`;
    xml += `
    <mxCell id="${rowId}" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="${s.id}">
      <mxGeometry y="${r * rowH}" width="${w}" height="${rowH}" as="geometry"/>
    </mxCell>`;

    row.forEach((cellVal, c) => {
      xml += `
    <mxCell id="${s.id}-r${r}-c${c}" value="${escapeXml(cellVal)}" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;overflow=hidden;" vertex="1" parent="${rowId}">
      <mxGeometry x="${c * colW}" width="${colW}" height="${rowH}" as="geometry">
        <mxRectangle width="${colW}" height="${rowH}" as="alternateBounds"/>
      </mxGeometry>
    </mxCell>`;
    });
  });

  return xml;
}

function buildListCell(s: Shape): string {
  const items  = s.items ?? ["Item 1", "Item 2", "Item 3"];
  const x      = s.x * CELL;
  const y      = s.y * CELL;
  const w      = s.w * CELL;
  const totalH = LIST_HEADER_H + items.length * LIST_ROW_H;

  let xml = `
    <mxCell id="${s.id}" value="${escapeXml(s.text || "List")}" style="swimlane;fontStyle=1;align=left;startSize=${LIST_HEADER_H};${rotationStyle(s.rotation)}" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${w}" height="${totalH}" as="geometry"/>
    </mxCell>`;

  items.forEach((item, i) => {
    xml += `
    <mxCell id="${s.id}-i${i}" value="${escapeXml(item)}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=8;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="${s.id}">
      <mxGeometry y="${i * LIST_ROW_H}" width="${w}" height="${LIST_ROW_H}" as="geometry"/>
    </mxCell>`;
  });

  return xml;
}

export function exportToDrawio(shapes: Shape[], edges: Edge[]): void {
  const shapeCells = shapes.map((s) => {
    if (s.type === "table") return buildTableCell(s);
    if (s.type === "list")  return buildListCell(s);
    return buildBasicCell(s);
  }).join("\n");

  const edgeCells = edges.map((e) => {
    const arrowStyle = (() => {
      switch (e.arrowType) {
        case "empty":  return "endArrow=open;endFill=0;";
        case "source": return "startArrow=block;startFill=1;endArrow=none;";
        case "both":   return "startArrow=block;startFill=1;endArrow=block;endFill=1;";
        default:       return "endArrow=block;endFill=1;";
      }
    })();
    return `
    <mxCell id="${e.id}" edge="1" source="${e.source}" target="${e.target}" parent="1" style="${arrowStyle}">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>`;
  }).join("\n");

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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "diagram.drawio";
  a.click();
  URL.revokeObjectURL(url);
}
