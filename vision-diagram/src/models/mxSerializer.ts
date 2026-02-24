import type { DiagramState } from "./types";

export function serializeToMxGraph(state: DiagramState): string {
  const cells = [
    `<mxCell id="0"/>`,
    `<mxCell id="1" parent="0"/>`
  ];

  state.shapes.forEach((shape) => {
    cells.push(`
      <mxCell id="${shape.id}"
              value="${shape.text || ""}"
              vertex="1"
              parent="1">
        <mxGeometry x="${shape.x}"
                    y="${shape.y}"
                    width="${shape.width}"
                    height="${shape.height}"
                    as="geometry"/>
      </mxCell>
    `);
  });

  state.edges.forEach((edge) => {
    cells.push(`
      <mxCell id="${edge.id}"
              edge="1"
              source="${edge.source}"
              target="${edge.target}"
              parent="1">
        <mxGeometry relative="1" as="geometry"/>
      </mxCell>
    `);
  });

  return `
<mxfile>
  <diagram name="Page-1">
    <mxGraphModel>
      <root>
        ${cells.join("\n")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
  `;
}
