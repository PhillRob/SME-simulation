import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

/** Subset of Cursor canvas host theme used by the dashboard + charts. */
export type CanvasHostTheme = {
  fill: { quaternary: string };
  text: { secondary: string; tertiary: string; link: string };
  stroke: { primary: string; secondary: string; tertiary: string };
  accent: { primary: string; control: string; controlHover: string };
  palette: {
    accent: string;
    link: string;
    buttonBackground: string;
    buttonHoverBackground: string;
    fillPrimary: string;
    fillSecondary: string;
    diffStripAdded: string;
    diffStripRemoved: string;
  };
  diff: {
    stripAdded: string;
    stripRemoved: string;
    removedLine: string;
    insertedLine: string;
  };
};

const hostTheme: CanvasHostTheme = {
  fill: { quaternary: "#f4f4f5" },
  text: {
    secondary: "#52525b",
    tertiary: "#71717a",
    link: "#2563eb",
  },
  stroke: {
    primary: "#18181b",
    secondary: "#d4d4d8",
    tertiary: "#e4e4e7",
  },
  accent: {
    primary: "#2563eb",
    control: "#3b82f6",
    controlHover: "#1d4ed8",
  },
  palette: {
    accent: "#2563eb",
    link: "#2563eb",
    buttonBackground: "#f4f4f5",
    buttonHoverBackground: "#e4e4e7",
    fillPrimary: "#18181b",
    fillSecondary: "#a1a1aa",
    diffStripAdded: "#bbf7d0",
    diffStripRemoved: "#fecaca",
  },
  diff: {
    stripAdded: "#22c55e",
    stripRemoved: "#ef4444",
    removedLine: "#fca5a5",
    insertedLine: "#86efac",
  },
};

export function useHostTheme(): CanvasHostTheme {
  return useMemo(() => hostTheme, []);
}

const LS_PREFIX = "bpla-sme-dashboard:";

export function useCanvasState<T>(
  key: string,
  initial: T,
): readonly [T, (next: T | ((prev: T) => T)) => void] {
  const storageKey = `${LS_PREFIX}${key}`;
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initial;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw == null) {
        return initial;
      }
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  }, [storageKey, state]);

  return [state, setState] as const;
}

export type ChartTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "secondary";

type StackProps = {
  gap?: number;
  children?: ReactNode;
  style?: CSSProperties;
};

export function Stack({ gap = 8, children, style }: StackProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${gap}px`,
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type RowProps = {
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  wrap?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
};

export function Row({ gap = 8, align = "center", wrap, children, style }: RowProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: wrap ? "wrap" : "nowrap",
        alignItems: align,
        gap: `${gap}px`,
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type GridProps = { columns: number; gap?: number; children?: ReactNode };

export function Grid({ columns, gap = 16, children }: GridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap}px`,
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

export function Spacer() {
  return <div style={{ flex: 1, minWidth: 8 }} />;
}

function headingStyle(level: 1 | 2 | 3): CSSProperties {
  if (level === 1) {
    return { fontSize: "1.5rem", fontWeight: 700, margin: 0, lineHeight: 1.25 };
  }
  if (level === 2) {
    return { fontSize: "1.125rem", fontWeight: 600, margin: 0, lineHeight: 1.35 };
  }
  return { fontSize: "1rem", fontWeight: 600, margin: 0, lineHeight: 1.4 };
}

export function H1({ children }: { children?: ReactNode }) {
  return <h1 style={headingStyle(1)}>{children}</h1>;
}

export function H2({ children }: { children?: ReactNode }) {
  return <h2 style={headingStyle(2)}>{children}</h2>;
}

export function H3({ children }: { children?: ReactNode }) {
  return <h3 style={headingStyle(3)}>{children}</h3>;
}

type TextProps = {
  children?: ReactNode;
  size?: "small";
  tone?: "secondary" | "tertiary";
  weight?: "semibold";
  style?: CSSProperties;
};

export function Text({ children, size, tone, weight, style }: TextProps) {
  const color =
    tone === "tertiary" ? "#71717a" : tone === "secondary" ? "#52525b" : "#18181b";
  return (
    <span
      style={{
        fontSize: size === "small" ? "0.8125rem" : "0.9375rem",
        lineHeight: size === "small" ? 1.35 : 1.45,
        color,
        fontWeight: weight === "semibold" ? 600 : 400,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Divider() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid #e4e4e7",
        margin: "8px 0",
      }}
    />
  );
}

export function Code({ children }: { children?: ReactNode }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: "10px 12px",
        background: "#fafafa",
        border: "1px solid #e4e4e7",
        borderRadius: 6,
        fontSize: "0.8125rem",
        overflow: "auto",
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      }}
    >
      <code>{children}</code>
    </pre>
  );
}

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({ variant = "primary", children, onClick, disabled }: ButtonProps) {
  const base: CSSProperties = {
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.875rem",
    fontWeight: 500,
    borderRadius: 6,
    padding: "6px 12px",
    border: "1px solid transparent",
    opacity: disabled ? 0.55 : 1,
  };
  const ghost: CSSProperties = {
    ...base,
    background: "transparent",
    borderColor: "transparent",
    color: "#52525b",
  };
  const secondary: CSSProperties = {
    ...base,
    background: "#f4f4f5",
    borderColor: "#d4d4d8",
    color: "#18181b",
  };
  const primary: CSSProperties = {
    ...base,
    background: "#2563eb",
    borderColor: "#2563eb",
    color: "#fff",
  };
  const style = variant === "ghost" ? ghost : variant === "secondary" ? secondary : primary;
  return (
    <button type="button" style={style} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

type PillProps = { active?: boolean; onClick?: () => void; children?: ReactNode };

export function Pill({ active, onClick, children }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: active ? "1px solid #2563eb" : "1px solid #d4d4d8",
        background: active ? "#eff6ff" : "#fff",
        color: active ? "#1d4ed8" : "#3f3f46",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

type CardProps = { children?: ReactNode };

export function Card({ children }: CardProps) {
  return (
    <div
      style={{
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = {
  children?: ReactNode;
  trailing?: ReactNode;
};

export function CardHeader({ children, trailing }: CardHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid #e4e4e7",
        fontWeight: 600,
        fontSize: "0.9375rem",
      }}
    >
      <div style={{ minWidth: 0 }}>{children}</div>
      {trailing ? <div style={{ flexShrink: 0 }}>{trailing}</div> : null}
    </div>
  );
}

type CardBodyProps = { children?: ReactNode; style?: CSSProperties };

export function CardBody({ children, style }: CardBodyProps) {
  return <div style={{ padding: 16, ...style }}>{children}</div>;
}

type StatProps = {
  value: ReactNode;
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "secondary";
};

const statToneColor: Record<NonNullable<StatProps["tone"]>, string> = {
  success: "#15803d",
  warning: "#b45309",
  danger: "#b91c1c",
  info: "#1d4ed8",
  secondary: "#52525b",
};

export function Stat({ value, label, tone }: StatProps) {
  const color = tone ? statToneColor[tone] : "#18181b";
  return (
    <div
      style={{
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        padding: "12px 14px",
        background: "#fafafa",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.05rem", fontWeight: 600, color, wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}

type CalloutProps = {
  tone?: "info" | "warning";
  title?: string;
  children?: ReactNode;
};

export function Callout({ tone = "info", title, children }: CalloutProps) {
  const bg = tone === "warning" ? "#fffbeb" : "#eff6ff";
  const border = tone === "warning" ? "#fcd34d" : "#bfdbfe";
  const titleColor = tone === "warning" ? "#92400e" : "#1e40af";
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 8,
        border: `1px solid ${border}`,
        background: bg,
        fontSize: "0.875rem",
        lineHeight: 1.45,
        color: "#3f3f46",
      }}
    >
      {title ? (
        <div style={{ fontWeight: 600, color: titleColor, marginBottom: 6 }}>{title}</div>
      ) : null}
      {children}
    </div>
  );
}

type TableProps = {
  headers: string[];
  rows: ReactNode[][];
  columnAlign?: ("left" | "right")[];
  striped?: boolean;
  emptyMessage?: string;
};

export function Table({ headers, rows, columnAlign, striped, emptyMessage }: TableProps) {
  if (rows.length === 0 && emptyMessage) {
    return <Text tone="secondary">{emptyMessage}</Text>;
  }
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e4e4e7", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "#fafafa" }}>
            {headers.map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: columnAlign?.[i] === "right" ? "right" : "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid #e4e4e7",
                  fontWeight: 600,
                  color: "#52525b",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{
                background: striped && ri % 2 === 1 ? "#fafafa" : "#fff",
              }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    textAlign: columnAlign?.[ci] === "right" ? "right" : "left",
                    padding: "10px 12px",
                    borderBottom: "1px solid #f4f4f5",
                    verticalAlign: "top",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type TextInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  style?: CSSProperties;
  disabled?: boolean;
};

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
  inputMode,
  autoComplete,
  style,
  disabled,
}: TextInputProps) {
  return (
    <input
      type={type}
      dir={dir}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid #d4d4d8",
        fontSize: "0.875rem",
        ...style,
      }}
    />
  );
}
