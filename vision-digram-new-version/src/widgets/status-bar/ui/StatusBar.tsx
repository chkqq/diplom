interface StatusBarProps {
  shapeCount: number;
  edgeCount: number;
  selectedId: string | null;
}

export function StatusBar({ shapeCount, edgeCount, selectedId }: StatusBarProps) {
  return (
    <div style={{
      height: 28, background: "#0a0f1a", borderTop: "1px solid #1e3a2f",
      display: "flex", alignItems: "center", padding: "0 16px", gap: 16,
      fontSize: 10, color: "#374151", flexShrink: 0,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <span>{shapeCount} shapes</span>
      <span>{edgeCount} connections</span>
      {selectedId && <span style={{ color: "#6ee7b7" }}>selected: {selectedId}</span>}
      <span style={{ marginLeft: "auto" }}>
        Pan: drag bg · Move: drag shape · Connect: port ◯ · Edit: dblclick · Delete: Del
      </span>
    </div>
  );
}
