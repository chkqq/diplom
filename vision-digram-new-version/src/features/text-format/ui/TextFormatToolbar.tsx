import { useRef, useEffect, useState } from "react";
import type { TextStyle } from "../../../shared/store/diagramStore";
import { DEFAULT_TEXT_STYLE } from "../../../shared/store/diagramStore";

interface TextFormatToolbarProps {
  anchorEl: { x: number; y: number } | null;
  style: TextStyle;
  onChange: (patch: Partial<TextStyle>) => void;
  onClose: () => void;
}

const FONTS = [
  "JetBrains Mono", "Inter", "Helvetica", "Arial",
  "Georgia", "Times New Roman", "Courier New", "Verdana", "Trebuchet MS",
];

// ── tiny helpers ──────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: "#1a2e26", margin: "2px 0" }} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: "#4b5563", fontSize: 9, letterSpacing: 1.2,
      textTransform: "uppercase" as const, marginBottom: 5,
    }}>{children}</div>
  );
}

function Btn({
  children, active, danger, title, onClick, style: extra,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  title?: string;
  onClick: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minWidth: 28, height: 28,
        padding: "0 7px",
        background: active ? "#064e3b" : hover ? "#1a2535" : "#131e2e",
        border: `1px solid ${active ? "#10b981" : danger ? "#7f1d1d" : "#1f2937"}`,
        borderRadius: 6,
        color: active ? "#10b981" : danger ? "#f87171" : "#9ca3af",
        cursor: "pointer",
        fontSize: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.1s, border-color 0.1s, color 0.1s",
        fontFamily: "'JetBrains Mono', monospace",
        ...extra,
      }}
    >{children}</button>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export function TextFormatToolbar({
  anchorEl, style, onChange, onClose,
}: TextFormatToolbarProps) {
  const panelRef   = useRef<HTMLDivElement>(null);
  const colorRef   = useRef<HTMLInputElement>(null);
  const ts = { ...DEFAULT_TEXT_STYLE, ...style };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!anchorEl) return null;

  // Position: fixed to the RIGHT side of screen, vertically centred near anchor
  const PANEL_W = 220;
  const PANEL_H = 480;
  const MARGIN  = 12;

  const right = MARGIN;
  // Try to vertically align near the anchor point
  let top = anchorEl.y - 60;
  if (top < MARGIN) top = MARGIN;
  if (top + PANEL_H > window.innerHeight - MARGIN) {
    top = window.innerHeight - PANEL_H - MARGIN;
  }

  const inputStyle: React.CSSProperties = {
    background: "#131e2e",
    border: "1px solid #1f2937",
    borderRadius: 6,
    color: "#d1fae5",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    padding: "4px 7px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const PRESETS = ["#d1fae5", "#ffffff", "#f9fafb", "#f87171", "#fb923c", "#fbbf24", "#4ade80", "#60a5fa", "#a78bfa", "#f472b6"];

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        right,
        top,
        width: PANEL_W,
        background: "#0b1524",
        border: "1px solid #1a2e26",
        borderRadius: 12,
        boxShadow: "0 12px 48px #00000099, 0 0 0 1px #10b98118",
        padding: "14px 12px",
        zIndex: 300,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: "#9ca3af",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        userSelect: "none",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: -2 }}>
        <span style={{ color: "#6ee7b7", fontWeight: 700, fontSize: 11, letterSpacing: 1.5 }}>ТЕКСТ</span>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "#374151",
          cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0,
        }}>✕</button>
      </div>

      <Divider />

      {/* ── Font family ── */}
      <div>
        <Label>Шрифт</Label>
        <select
          value={ts.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* ── Style toggles + size ── */}
      <div>
        <Label>Начертание</Label>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <Btn active={ts.bold}          title="Жирный (B)"       onClick={() => onChange({ bold: !ts.bold })}>
            <strong>B</strong>
          </Btn>
          <Btn active={ts.italic}        title="Курсив (I)"       onClick={() => onChange({ italic: !ts.italic })}>
            <em>I</em>
          </Btn>
          <Btn active={ts.underline}     title="Подчёркнутый (U)" onClick={() => onChange({ underline: !ts.underline })}>
            <span style={{ textDecoration: "underline" }}>U</span>
          </Btn>
          <Btn active={ts.strikethrough} title="Зачёркнутый"      onClick={() => onChange({ strikethrough: !ts.strikethrough })}>
            <span style={{ textDecoration: "line-through" }}>S</span>
          </Btn>

          <div style={{ flex: 1 }} />

          {/* Size stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button
              onClick={() => onChange({ fontSize: Math.max(6, ts.fontSize - 1) })}
              style={{ ...inputStyle, width: 22, padding: 0, textAlign: "center", cursor: "pointer", color: "#6ee7b7" }}
            >−</button>
            <input
              type="number" min={6} max={96}
              value={ts.fontSize}
              onChange={(e) => onChange({ fontSize: Math.max(6, Math.min(96, +e.target.value)) })}
              onKeyDown={(e) => e.stopPropagation()}
              style={{ ...inputStyle, width: 38, textAlign: "center", padding: "4px 2px" }}
            />
            <button
              onClick={() => onChange({ fontSize: Math.min(96, ts.fontSize + 1) })}
              style={{ ...inputStyle, width: 22, padding: 0, textAlign: "center", cursor: "pointer", color: "#6ee7b7" }}
            >+</button>
          </div>
        </div>
      </div>

      {/* ── Quick size chips ── */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
        {[10, 12, 14, 16, 20, 24, 32].map((sz) => (
          <Btn
            key={sz}
            active={ts.fontSize === sz}
            onClick={() => onChange({ fontSize: sz })}
            style={{ minWidth: 0, padding: "0 8px", fontSize: 10 }}
          >{sz}</Btn>
        ))}
      </div>

      <Divider />

      {/* ── Alignment ── */}
      <div>
        <Label>Выравнивание</Label>
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { v: "left",    icon: "≡", label: "По левому краю" },
            { v: "center",  icon: "≡", label: "По центру" },
            { v: "right",   icon: "≡", label: "По правому краю" },
            { v: "justify", icon: "≡", label: "По ширине" },
          ] as const).map(({ v, label }, i) => (
            <Btn key={v} active={ts.align === v} title={label}
              onClick={() => onChange({ align: v })}
              style={{ flex: 1, fontSize: 13 }}
            >
              {/* Custom alignment glyphs via SVG lines */}
              <svg width="14" height="12" viewBox="0 0 14 12">
                {i === 0 && <>
                  <line x1="0" y1="2"  x2="14" y2="2"  stroke="currentColor" strokeWidth="1.5" />
                  <line x1="0" y1="6"  x2="9"  y2="6"  stroke="currentColor" strokeWidth="1.5" />
                  <line x1="0" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" />
                </>}
                {i === 1 && <>
                  <line x1="0" y1="2"  x2="14" y2="2"  stroke="currentColor" strokeWidth="1.5" />
                  <line x1="2.5" y1="6"  x2="11.5" y2="6"  stroke="currentColor" strokeWidth="1.5" />
                  <line x1="0" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" />
                </>}
                {i === 2 && <>
                  <line x1="0" y1="2"  x2="14" y2="2"  stroke="currentColor" strokeWidth="1.5" />
                  <line x1="5" y1="6"  x2="14" y2="6"  stroke="currentColor" strokeWidth="1.5" />
                  <line x1="0" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" />
                </>}
                {i === 3 && <>
                  <line x1="0" y1="2"  x2="14" y2="2"  stroke="currentColor" strokeWidth="1.5" />
                  <line x1="0" y1="6"  x2="14" y2="6"  stroke="currentColor" strokeWidth="1.5" />
                  <line x1="0" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" />
                </>}
              </svg>
            </Btn>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── Font color ── */}
      <div>
        <Label>Цвет шрифта</Label>

        {/* Native color picker — clicking the swatch opens OS color picker */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          <div
            title="Открыть палитру"
            onClick={() => colorRef.current?.click()}
            style={{
              width: 34, height: 34,
              background: ts.color,
              borderRadius: 7,
              border: "2px solid #1f2937",
              cursor: "pointer",
              flexShrink: 0,
              position: "relative",
              boxShadow: `0 0 0 1px ${ts.color}44`,
              transition: "box-shadow 0.15s",
            }}
          >
            {/* Hidden native color input — positioned over swatch so click triggers it */}
            <input
              ref={colorRef}
              type="color"
              value={ts.color}
              onChange={(e) => onChange({ color: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute", inset: 0,
                opacity: 0, cursor: "pointer",
                width: "100%", height: "100%",
                border: "none", padding: 0,
              }}
            />
          </div>

          {/* Hex input */}
          <input
            type="text"
            value={ts.color}
            maxLength={7}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange({ color: v });
            }}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ ...inputStyle, width: "100%", letterSpacing: 1 }}
            placeholder="#d1fae5"
          />
        </div>

        {/* Preset swatches */}
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
          {PRESETS.map((c) => (
            <div
              key={c}
              title={c}
              onClick={() => onChange({ color: c })}
              style={{
                width: 20, height: 20,
                background: c,
                borderRadius: 4,
                cursor: "pointer",
                border: ts.color.toLowerCase() === c.toLowerCase()
                  ? "2px solid #10b981"
                  : "1px solid #1f2937",
                flexShrink: 0,
                transition: "transform 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          ))}
        </div>
      </div>

      <Divider />

      {/* ── Line height ── */}
      <div>
        <Label>Межстрочный интервал</Label>
        <div style={{ display: "flex", gap: 4 }}>
          {[1.0, 1.2, 1.5, 1.8, 2.0].map((lh) => (
            <Btn key={lh} active={Math.abs(ts.lineHeight - lh) < 0.05}
              onClick={() => onChange({ lineHeight: lh })}
              style={{ flex: 1, fontSize: 10, minWidth: 0, padding: "0 4px" }}
            >{lh}×</Btn>
          ))}
        </div>
      </div>
    </div>
  );
}
