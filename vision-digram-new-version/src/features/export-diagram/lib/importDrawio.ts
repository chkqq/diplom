import type { Shape, Edge, ArrowType } from "../../../shared/store/diagramStore";
import { DEFAULT_TEXT_STYLE } from "../../../shared/store/diagramStore";
import { CELL } from "../../../shared/config/grid";

interface RawCell {
  id:     string;
  value:  string;
  style:  string;
  parent: string;
  vertex: boolean;
  edge:   boolean;
  source: string;
  target: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function parseCells(doc: Document): RawCell[] {
  return Array.from(doc.querySelectorAll("mxCell")).map((el) => {
    const geo = el.querySelector("mxGeometry");
    return {
      id:     el.getAttribute("id")     ?? "",
      value:  el.getAttribute("value")  ?? "",
      style:  el.getAttribute("style")  ?? "",
      parent: el.getAttribute("parent") ?? "",
      vertex: el.getAttribute("vertex") === "1",
      edge:   el.getAttribute("edge")   === "1",
      source: el.getAttribute("source") ?? "",
      target: el.getAttribute("target") ?? "",
      x: parseFloat(geo?.getAttribute("x")      ?? "0"),
      y: parseFloat(geo?.getAttribute("y")      ?? "0"),
      w: parseFloat(geo?.getAttribute("width")  ?? "80"),
      h: parseFloat(geo?.getAttribute("height") ?? "60"),
    };
  });
}

function detectType(style: string): Shape["type"] {
  if (style.includes("shape=table")) return "table";
  if (style.includes("swimlane"))    return "list";
  if (style.includes("ellipse"))     return "circle";
  if (style.includes("rhombus"))     return "diamond";
  return "rectangle";
}

function parseArrowType(style: string): ArrowType {
  const hasStart = /startArrow=(?!none)/.test(style);
  const endNone  = /endArrow=none/.test(style);
  const emptyEnd = /endArrow=open/.test(style) || /endFill=0/.test(style);
  if (hasStart && endNone) return "source";
  if (hasStart)            return "both";
  if (emptyEnd)            return "empty";
  return "filled";
}

function parseRotation(style: string): number {
  const m = style.match(/rotation=(-?\d+(?:\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : 0;
}

function toGrid(px: number): number {
  return Math.max(1, Math.round(px / CELL));
}

export function importFromDrawio(xmlText: string): { shapes: Shape[]; edges: Edge[] } {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");

  const parseErr = doc.querySelector("parsererror");
  if (parseErr) throw new Error("Невалидный XML файл");

  const cells = parseCells(doc);
  const shapes: Shape[] = [];
  const edges:  Edge[]  = [];

  // Root container id — "1" in standard draw.io files
  const rootId = "1";

  // top-level vertex cells (direct children of root)
  const topLevel = cells.filter(
    (c) => c.vertex && c.parent === rootId && c.id !== "0" && c.id !== "1"
  );

  for (const cell of topLevel) {
    const type = detectType(cell.style);

    if (type === "table") {
      // rows: children whose style contains "tableRow"
      const rows = cells
        .filter((c) => c.parent === cell.id && c.style.includes("tableRow"))
        .sort((a, b) => a.y - b.y);

      const cellsData: string[][] = rows.map((row) =>
        cells
          .filter((c) => c.parent === row.id && c.style.includes("partialRectangle"))
          .sort((a, b) => a.x - b.x)
          .map((c) => c.value)
      );

      const numRows = rows.length || 3;
      const numCols = (cellsData[0]?.length) || 3;

      shapes.push({
        id:   cell.id,
        type: "table",
        x: toGrid(cell.x),
        y: toGrid(cell.y),
        w: toGrid(cell.w),
        h: toGrid(cell.h),
        text:      cell.value,
        rotation:  parseRotation(cell.style),
        rows:      numRows,
        cols:      numCols,
        cells:     cellsData,
        items:     [],
        textStyle: DEFAULT_TEXT_STYLE,
      });
      continue;
    }

    if (type === "list") {
      const items = cells
        .filter((c) => c.parent === cell.id && c.vertex)
        .sort((a, b) => a.y - b.y)
        .map((c) => c.value)
        .filter(Boolean);

      shapes.push({
        id:   cell.id,
        type: "list",
        x: toGrid(cell.x),
        y: toGrid(cell.y),
        w: toGrid(cell.w),
        h: toGrid(cell.h),
        text:      cell.value,
        rotation:  parseRotation(cell.style),
        items:     items.length ? items : ["Item 1", "Item 2", "Item 3"],
        rows:      3,
        cols:      3,
        cells:     [],
        textStyle: DEFAULT_TEXT_STYLE,
      });
      continue;
    }

    shapes.push({
      id:   cell.id,
      type,
      x: toGrid(cell.x),
      y: toGrid(cell.y),
      w: toGrid(cell.w),
      h: toGrid(cell.h),
      text:      cell.value,
      rotation:  parseRotation(cell.style),
      items:     [],
      rows:      3,
      cols:      3,
      cells:     [],
      textStyle: DEFAULT_TEXT_STYLE,
    });
  }

  // edges
  cells
    .filter((c) => c.edge && c.source && c.target)
    .forEach((c) => {
      const arrowType = parseArrowType(c.style);
      edges.push({ id: c.id, source: c.source, target: c.target, arrowType });
    });

  return { shapes, edges };
}
