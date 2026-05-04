import type { ReactNode } from "react";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Spacer,
  Stack,
  Stat,
  Table,
  Text,
  TextInput,
  useCanvasState,
  useHostTheme,
  type CanvasHostTheme,
  type ChartTone,
} from "./canvas-shim";

/** Orderbook parameter: fixed label height + full-width input for aligned grid layout. */
function OrderbookParamCell(props: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
        height: "100%",
      }}
    >
      <Text size="small" tone="secondary" style={{ minHeight: 44, lineHeight: 1.35 }}>
        {props.label}
      </Text>
      <div style={{ width: "100%" }}>{props.children}</div>
    </div>
  );
}

/** Matches `canvasTypography.small` from the canvas theme (not re-exported on the barrel). */
const CHART_SMALL_PX = "12px";
const CHART_LINE_HEIGHT = "16px";
/** Matches `canvasSpacing` scale: 1→4px, 2→8px, 1.5→6px, 4→16px. */
const S1 = 4;
const S1_5 = 6;
const S2 = 8;
const S4 = 16;

const SAR = new Intl.NumberFormat("en-SA", {
  maximumFractionDigits: 0,
});

type FormatNumericOpts = {
  allowDecimal?: boolean;
  /** Leading − only (opening cash, offsets). */
  allowMinus?: boolean;
};

/** Remove grouping / spaces / Arabic separators before parsing. */
function stripForNumericParse(raw: string): string {
  return String(raw)
    .replace(/\u066C/g, "")
    .replace(/\u066B/g, ".")
    .replace(/,/g, "")
    .replace(/\u202F/g, "")
    .replace(/\u00A0/g, "")
    .replace(/\s/g, "")
    .trim();
}

function parseNum(s: string, fallback: number): number {
  const t = stripForNumericParse(s);
  const n = Number(t);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * LTR grouped thousands (comma) English-style; strips user commas then reapplies idempotently.
 * Optional single decimal fragment (western `.`) for percentages / deals with decimals is allowed.
 */
function formatNumericInputEnglish(incoming: string, opts: FormatNumericOpts = {}): string {
  const allowDecimal = opts.allowDecimal ?? false;
  const allowMinus = opts.allowMinus ?? false;

  const bareIn = incoming
    .replace(/\u066C/g, ",")
    .replace(/\u066B/g, ".")
    .replace(/\u202F/g, "")
    .replace(/\u00A0/g, "")
    .trim();

  if (bareIn === "" || bareIn === "+" || bareIn === ".") {
    return "";
  }
  if (allowMinus && bareIn === "-") {
    return "-";
  }

  let raw = stripForNumericParse(bareIn.replace(/,/g, ""));
  if (raw === "") {
    return "";
  }

  let neg = false;
  if (allowMinus && raw.startsWith("-")) {
    neg = true;
    raw = raw.slice(1);
    if (raw === "") {
      return "-";
    }
  }

  let hadTrailingDot = false;
  if (allowDecimal) {
    hadTrailingDot = raw.endsWith(".");
    if (hadTrailingDot) {
      raw = raw.slice(0, -1);
    }
  }

  if (allowDecimal) {
    raw = raw.replace(/[^\d.]/g, "");
  } else {
    raw = raw.replace(/\D/g, "");
    if (raw === "") {
      return neg ? "-" : "";
    }
  }

  let intDigits = "";
  let fracDigits = "";
  if (allowDecimal) {
    const d = raw.indexOf(".");
    if (d >= 0) {
      intDigits = raw.slice(0, d).replace(/\D/g, "");
      fracDigits = raw
        .slice(d + 1)
        .replace(/\./g, "")
        .replace(/\D/g, "")
        .slice(0, 12);
    } else {
      intDigits = raw.replace(/\D/g, "");
    }
  } else {
    intDigits = raw.replace(/\D/g, "");
    fracDigits = "";
  }

  intDigits = intDigits.replace(/^0+(?=\d)/, "");

  const needZeroForFrac = intDigits === "" && (fracDigits.length > 0 || hadTrailingDot);
  if (needZeroForFrac) {
    intDigits = "0";
  }
  if (intDigits === "" && fracDigits === "" && !hadTrailingDot) {
    return neg ? "-" : "";
  }

  const groupedInt =
    intDigits === "" ? "0" : intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (allowDecimal && (fracDigits.length > 0 || hadTrailingDot)) {
    const body =
      fracDigits.length > 0 ? `${groupedInt}.${fracDigits}` : `${groupedInt}.`;
    return neg ? `-${body}` : body;
  }

  return neg ? `-${groupedInt}` : groupedInt;
}

const numericEntryInputStyle = {
  direction: "ltr" as const,
  textAlign: "right" as const,
  fontVariantNumeric: "tabular-nums",
};

/** Text field for calculator-style numeric entry (comma thousands, western decimal, LTR). */
function NumericTextInput(props: {
  value: string;
  onChange: (next: string) => void;
  allowDecimal?: boolean;
  allowMinus?: boolean;
  placeholder?: string;
  style?: Record<string, string | number | undefined>;
}) {
  const { value, onChange, allowDecimal, allowMinus, placeholder, style } = props;
  const opts: FormatNumericOpts = { allowDecimal, allowMinus };
  return (
    <TextInput
      type="text"
      dir="ltr"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      autoComplete="off"
      placeholder={placeholder}
      value={formatNumericInputEnglish(value, opts)}
      onChange={(next) => onChange(formatNumericInputEnglish(next, opts))}
      style={{ ...numericEntryInputStyle, ...style }}
    />
  );
}

function formatIntGroupedPlaceholderEn(n: number): string {
  return formatNumericInputEnglish(String(Math.round(n)), {});
}

/** Horizon step label for axes / tables, e.g. `month 0` … `month 24`. */
function monthOrdinal(step: number): string {
  return `month ${step}`;
}

type ExpenditureRow = {
  id: string;
  /** OPEX line item (free text). */
  item: string;
  /** SAR per cost driver unit (stored as numeric string). */
  unitRateSar: string;
  /** Cost driver volume per month (stored as numeric string). */
  costDriverQty: string;
  /** Legacy fields kept for backward compatibility with previously saved rows. */
  category?: string;
  comment?: string;
  amount?: string;
};

function newRowId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Starting template (editable in the UI; reset restores this). */
const DEFAULT_EXPENDITURE_ROWS: ExpenditureRow[] = [
  {
    id: "r-def-1",
    item: "Germany payroll (10 FTE)",
    unitRateSar: "20000",
    costDriverQty: "10",
  },
  {
    id: "r-def-2",
    item: "KSA payroll (grade A)",
    unitRateSar: "40000",
    costDriverQty: "50",
  },
  {
    id: "r-def-3",
    item: "GOSI contributions",
    unitRateSar: "7970000",
    costDriverQty: "1",
  },
  {
    id: "r-def-4",
    item: "KSA payroll (grade B)",
    unitRateSar: "20000",
    costDriverQty: "20",
  },
  {
    id: "r-def-5",
    item: "GOSI + social charges (additional team)",
    unitRateSar: "32000",
    costDriverQty: "1",
  },
  {
    id: "r-def-6",
    item: "Health insurance",
    unitRateSar: "500",
    costDriverQty: "70",
  },
  {
    id: "r-def-7",
    item: "Office lease and facilities",
    unitRateSar: "125000",
    costDriverQty: "2",
  },
  {
    id: "r-def-8",
    item: "Operating overhead",
    unitRateSar: "100000",
    costDriverQty: "1",
  },
  {
    id: "r-def-9",
    item: "Debt service",
    unitRateSar: "100000",
    costDriverQty: "1",
  },
];

function expenditureUnitRateSar(row: ExpenditureRow): number {
  if (row.unitRateSar != null) {
    return parseNum(row.unitRateSar, 0);
  }
  return parseNum(row.amount ?? "0", 0);
}

function expenditureCostDriverQty(row: ExpenditureRow): number {
  if (row.costDriverQty != null) {
    return parseNum(row.costDriverQty, 1);
  }
  return 1;
}

function expenditureLineTotalSar(row: ExpenditureRow): number {
  return expenditureUnitRateSar(row) * expenditureCostDriverQty(row);
}

function sumExpenditureRows(rows: ExpenditureRow[]): number {
  return rows.reduce((a, r) => a + expenditureLineTotalSar(r), 0);
}

function cloneDefaultRows(): ExpenditureRow[] {
  return DEFAULT_EXPENDITURE_ROWS.map((r) => ({ ...r }));
}

type PaymentLegRow = {
  id: string;
  label: string;
  /** Contract share % (digits, e.g. 10 for 10%) */
  pct: string;
  /** Months after award when payment due (ordinal offset; integer stored as string). */
  offsetMonths: string;
};

function newPaymentLegId(): string {
  return `pl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Default 10 / 40 / 40 / 10 pattern; completion legs use D and D+1 month offsets from contract. */
function cloneDefaultPaymentLegs(contractToCompletionMo: number): PaymentLegRow[] {
  const D = Math.max(0, Math.round(contractToCompletionMo));
  return [
    { id: "pl-def-1", label: "Award", pct: "10", offsetMonths: "0" },
    { id: "pl-def-2", label: "+1 month from award", pct: "40", offsetMonths: "1" },
    { id: "pl-def-3", label: "At completion", pct: "40", offsetMonths: String(D) },
    { id: "pl-def-4", label: "+1 month after completion", pct: "10", offsetMonths: String(D + 1) },
  ];
}

function parsePaymentLegRows(rows: PaymentLegRow[]) {
  return rows.map((r) => ({
    label: r.label.trim() || "Payment",
    frac: Math.max(0, parseNum(r.pct, 0) / 100),
    offsetFromContract: Math.round(parseNum(r.offsetMonths, 0)),
  }));
}

type ProjectScheduleRow = {
  projectIndex: number;
  submissionMonth: number;
  contractMonth: number;
  completionMonth: number;
  valueSar: number;
};

function simulateOrderbookCash(args: {
  orderbookSar: number;
  numProjects: number;
  submissionToContractMo: number;
  contractToCompletionMo: number;
  paymentLagAfterDueMo: number;
  staggerBetweenSubmissionsMo: number;
  firstSubmissionMonth: number;
  horizonMonths: number;
  legs: ReadonlyArray<{ frac: number; offsetFromContract: number; label: string }>;
}) {
  const n = Math.max(1, Math.round(args.numProjects));
  const H = Math.max(6, Math.round(args.horizonMonths));
  const perProject = args.orderbookSar / n;
  const legs = args.legs;
  const monthly = new Array<number>(H + 1).fill(0);
  const rows: ProjectScheduleRow[] = [];

  for (let k = 0; k < n; k++) {
    const S =
      args.firstSubmissionMonth + k * args.staggerBetweenSubmissionsMo;
    const C = S + args.submissionToContractMo;
    const completion = C + args.contractToCompletionMo;
    rows.push({
      projectIndex: k + 1,
      submissionMonth: S,
      contractMonth: C,
      completionMonth: completion,
      valueSar: perProject,
    });
    for (const leg of legs) {
      const dueMonth = C + leg.offsetFromContract;
      const cashMonth = dueMonth + args.paymentLagAfterDueMo;
      if (cashMonth >= 0 && cashMonth <= H) {
        monthly[cashMonth] += perProject * leg.frac;
      }
    }
  }

  const cumulative: number[] = [];
  let run = 0;
  for (let m = 0; m <= H; m++) {
    run += monthly[m];
    cumulative.push(run);
  }

  let afterHorizon = 0;
  for (let k = 0; k < n; k++) {
    const S =
      args.firstSubmissionMonth + k * args.staggerBetweenSubmissionsMo;
    const C = S + args.submissionToContractMo;
    for (const leg of legs) {
      const dueMonth = C + leg.offsetFromContract;
      const cashMonth = dueMonth + args.paymentLagAfterDueMo;
      if (cashMonth > H) {
        afterHorizon += perProject * leg.frac;
      }
    }
  }

  const categories = Array.from({ length: H + 1 }, (_, m) => monthOrdinal(m));
  const firstProject = rows[0];
  const firstCashMonth =
    firstProject != null && legs.length > 0
      ? Math.min(
          ...legs.map(
            (leg) =>
              firstProject.contractMonth +
              leg.offsetFromContract +
              args.paymentLagAfterDueMo,
          ),
        )
      : 0;
  const winToFirstCashLag =
    firstProject != null ? firstCashMonth - firstProject.submissionMonth : 0;

  return {
    monthly,
    cumulative,
    categories,
    rows,
    legs,
    perProject,
    afterHorizon,
    totalBook: args.orderbookSar,
    winToFirstCashLag,
  };
}

/**
 * Cash receipts from incremental pipeline SAR (won / intake) per horizon step, modeled as pipeline
 * notional per month—not accrual P&L. Each win-month cohort splits evenly across parallel projects (same notion
 * as orderbook projects); each project uses the same milestones as orderbook (% of engagement at offsets in
 * months from award, plus lag).
 */
function simulateMonthlyPipelineCash(args: {
  horizonMonths: number;
  monthlyPipelineNotionalSar: number;
  parallelProjectsCount: number;
  submissionToContractMo: number;
  paymentLagAfterDueMo: number;
  staggerBetweenSubmissionsMo: number;
  legs: ReadonlyArray<{ frac: number; offsetFromContract: number; label: string }>;
}) {
  const H = Math.max(6, Math.round(args.horizonMonths));
  const n = Math.max(1, Math.round(args.parallelProjectsCount));
  const monthly = new Array<number>(H + 1).fill(0);
  const W = Math.max(0, args.monthlyPipelineNotionalSar);

  for (let winMonth = 0; winMonth <= H; winMonth++) {
    const perProject = W / n;
    for (let j = 0; j < n; j++) {
      const S = winMonth + j * args.staggerBetweenSubmissionsMo;
      const C = S + args.submissionToContractMo;
      for (const leg of args.legs) {
        const dueMonth = C + leg.offsetFromContract;
        const cashMonth = dueMonth + args.paymentLagAfterDueMo;
        if (cashMonth >= 0 && cashMonth <= H) {
          monthly[cashMonth] += perProject * leg.frac;
        }
      }
    }
  }

  const cumulative: number[] = [];
  let run = 0;
  for (let m = 0; m <= H; m++) {
    run += monthly[m];
    cumulative.push(run);
  }

  return { monthly, cumulative, categories: Array.from({ length: H + 1 }, (_, m) => monthOrdinal(m)) };
}

/** High-contrast chart palette first, theme colours as fallback (deduped). */
function distinctChartColours(theme: CanvasHostTheme): string[] {
  const raw: string[] = [
    "#0B6E4F", // green
    "#B33A3A", // red
    "#6D28D9", // purple
    "#0E7490", // teal
    "#C2410C", // orange
    "#1D4ED8", // blue
    "#BE185D", // magenta
    "#4B5563", // slate
    theme.diff.stripAdded,
    theme.palette.diffStripAdded,
    theme.diff.stripRemoved,
    theme.palette.diffStripRemoved,
    theme.palette.accent,
    theme.accent.primary,
    theme.text.link,
    theme.palette.link,
    theme.stroke.primary,
    theme.stroke.secondary,
    theme.palette.fillPrimary,
    theme.palette.fillSecondary,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of raw) {
    const v = typeof c === "string" ? c.trim() : "";
    if (!v || seen.has(v)) {
      continue;
    }
    seen.add(v);
    out.push(v);
  }
  return out.length > 0 ? out : [theme.stroke.primary];
}

/** Per-series colour by index so every trace in a chart is visually distinct (cycles if many series). */
function chartSeriesColour(theme: CanvasHostTheme, seriesIndex: number): string {
  const list = distinctChartColours(theme);
  return list[seriesIndex % list.length] ?? theme.stroke.primary;
}

function truncateCategoryLabel(raw: string, maxLen = 14): string {
  const s = raw.trim();
  return s.length <= maxLen ? s : `${s.slice(0, Math.max(1, maxLen - 1))}\u2026`;
}

/** Compact axis ticks (similar spirit to portal chart formatter). */
function formatAxisCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) {
    return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  }
  if (abs >= 1e3) {
    return `${(n / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}K`;
  }
  if (Number.isInteger(n)) {
    return `${n}`;
  }
  const t = n.toFixed(abs >= 10 ? 1 : 2).replace(/\.?0+$/, "");
  return t;
}

function labelStride(catCount: number, maxShown: number): number {
  return Math.max(1, Math.ceil(catCount / maxShown));
}

type AxisLineSeries = { name: string; data: number[]; tone?: ChartTone };

/**
 * Line charts in the canvas runtime clamp negatives to zero and omit the horizontal guide at exactly 0,
 * which breaks cash‑balance visuals. Domain always spans numeric 0 when any point could cross or touch it.
 */
function AxisLineChart(props: {
  categories: readonly string[];
  series: AxisLineSeries[];
  height?: number;
  fill?: boolean;
}) {
  const theme = useHostTheme();
  const height = props.height ?? 240;
  const cats = props.categories ?? [];
  const series = props.series ?? [];
  const m = cats.length;
  const dlen = series.length;
  const top = 16;
  const right = 12;
  const bottom = 40;
  const left = 54;
  const vbW = 900;
  const plotW = vbW - left - right;
  const plotH = height - top - bottom;
  const plotLeft = left;
  const plotTop = top;
  const plotBottom = top + plotH;

  if (m === 0 || dlen === 0 || series.some((s) => s.data.length !== m)) {
    return (
      <div
        aria-label="Chart"
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
          border: `1px solid ${theme.stroke.secondary}`,
          background: theme.fill.quaternary,
          color: theme.text.secondary,
          fontSize: CHART_SMALL_PX,
          lineHeight: CHART_LINE_HEIGHT,
          width: "100%",
          minWidth: 0,
        }}
      >
        No data
      </div>
    );
  }

  const flatVals = series.flatMap((s) => s.data);
  let vmin = Math.min(...flatVals);
  let vmax = Math.max(...flatVals);
  let yLo = Math.min(0, vmin);
  let yHi = Math.max(0, vmax);
  if (yHi <= yLo) {
    yHi = yLo + 1;
  }
  const inner = yHi - yLo || 1;
  const pad = inner * 0.06;
  yLo -= pad;
  yHi += pad;
  yLo = Math.min(yLo, 0);
  yHi = Math.max(yHi, 0);

  const tickCount = 5;
  const tickSet = new Set<number>();
  for (let i = 0; i < tickCount; i++) {
    tickSet.add(yLo + ((yHi - yLo) * i) / Math.max(tickCount - 1, 1));
  }
  if (yLo <= 0 && yHi >= 0) {
    tickSet.add(0);
  }
  const ticks = [...tickSet].sort((a, b) => a - b);

  const ySvg = (v: number) => plotBottom - ((v - yLo) / (yHi - yLo)) * plotH;

  const xSvg = (i: number) => {
    if (m <= 1) {
      return plotLeft + plotW / 2;
    }
    return plotLeft + (plotW * i) / (m - 1);
  };

  const lbl = svgLabelStyle(theme);
  const stride = labelStride(m, 10);

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${vbW} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Line chart"
        style={{ display: "block", width: "100%" }}
      >
        {/* Y-axis ticks and horizontal guides (always draw numeric 0 when in range). */}
        {ticks.map((v) => {
          const gy = ySvg(v);
          const isZero = Math.abs(v) < 1e-9 * Math.max(Math.abs(yLo), Math.abs(yHi), 1);
          if (gy < plotTop || gy > plotBottom) {
            return null;
          }
          return (
            <g key={`yt-${v}`}>
              {!isZero ? (
                <line
                  x1={plotLeft}
                  x2={vbW - right}
                  y1={gy}
                  y2={gy}
                  stroke={theme.stroke.tertiary}
                  strokeWidth={1}
                />
              ) : (
                <line
                  x1={plotLeft}
                  x2={vbW - right}
                  y1={gy}
                  y2={gy}
                  stroke={theme.stroke.secondary}
                  strokeWidth={1.75}
                />
              )}
              <text
                x={plotLeft - S2}
                y={gy + 4}
                textAnchor="end"
                fill={theme.text.tertiary}
                fontSize={CHART_SMALL_PX}
                fontFamily={lbl.fontFamily}
              >
                {formatAxisCompact(v)}
              </text>
            </g>
          );
        })}

        {series.map((s, si) => {
          const strokeCol = chartSeriesColour(theme, si);
          const pts = s.data.map((val, idx) => ({ x: xSvg(idx), y: ySvg(val) }));
          if (pts.length === 0) {
            return null;
          }
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
          const fillPath =
            props.fill && pts.length >= 2
              ? [`M ${pts[0].x} ${plotBottom}`, ...pts.map((p) => `L ${p.x} ${p.y}`), `L ${pts[pts.length - 1].x} ${plotBottom}`, "Z"].join(" ")
              : null;
          return (
            <g key={`${s.name}-${si}`}>
              {fillPath ? (
                <path d={fillPath} fill={strokeCol} fillOpacity={0.12} stroke="none" />
              ) : null}
              <path
                d={d}
                fill="none"
                stroke={strokeCol}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {m <= 24 &&
                pts.map((p, i) => (
                  <circle key={`${si}-${cats[i] ?? i}`} cx={p.x} cy={p.y} r={2.5} fill={strokeCol} />
                ))}
            </g>
          );
        })}

        {cats.map((cat, r) => {
          const gx = xSvg(r);
          const hitW = m <= 1 ? plotW : plotW / Math.max(m - 1, 1);
          return (
            <g key={cat}>
              <rect x={gx - hitW / 2} y={plotTop} width={hitW} height={plotH} fill="transparent" />
              {r % stride === 0 || r === m - 1 ? (
                <text
                  x={gx}
                  y={height - S1}
                  textAnchor="middle"
                  fill={theme.text.secondary}
                  fontSize={CHART_SMALL_PX}
                  fontFamily={lbl.fontFamily}
                >
                  {truncateCategoryLabel(cat)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {dlen >= 2 ? (
        <Row gap={S4} wrap style={{ marginTop: S2, paddingLeft: S1 }}>
          {series.map((s, i) => (
            <Row gap={S1_5} align="center" key={`${s.name}-${i}`}>
              <span
                style={{
                  width: 12,
                  height: 3,
                  backgroundColor: chartSeriesColour(theme, i),
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
              <Text size="small" tone="secondary">
                {s.name}
              </Text>
            </Row>
          ))}
        </Row>
      ) : null}
    </div>
  );
}

function svgLabelStyle(theme: CanvasHostTheme) {
  const family =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  return { fill: theme.text.tertiary, fontFamily: family, fontSize: CHART_SMALL_PX };
}

/** Non‑negative magnitude bars; baseline at y = 0 is always drawn explicitly. */
function AxisBarChart(props: {
  categories: readonly string[];
  series: { name: string; data: readonly number[]; tone?: ChartTone }[];
  height?: number;
}) {
  const theme = useHostTheme();
  const height = props.height ?? 220;
  const cats = props.categories ?? [];
  const series = props.series ?? [];
  const m = cats.length;
  const dlen = series.length;
  const top = 16;
  const right = 12;
  const bottom = 40;
  const left = 48;
  const vbW = 900;
  const plotW = vbW - left - right;
  const plotH = height - top - bottom;
  const plotLeft = left;
  const plotTop = top;
  const plotBottom = plotTop + plotH;

  if (m === 0 || dlen === 0 || series.some((s) => s.data.length !== m)) {
    return (
      <div
        aria-label="Chart"
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
          border: `1px solid ${theme.stroke.secondary}`,
          background: theme.fill.quaternary,
          color: theme.text.secondary,
          fontSize: CHART_SMALL_PX,
          lineHeight: CHART_LINE_HEIGHT,
          width: "100%",
          minWidth: 0,
        }}
      >
        No data
      </div>
    );
  }

  let ymax = 0;
  for (const s of series) {
    for (const raw of s.data) {
      const v = Number.isFinite(raw) && raw >= 0 ? raw : 0;
      ymax = Math.max(ymax, v);
    }
  }
  let yHi = ymax <= 0 ? 1 : ymax * 1.08;

  const tickCount = 5;
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    ticks.push((yHi * i) / Math.max(tickCount - 1, 1));
  }
  ticks.push(0);
  const yTicks = [...new Set(ticks)].sort((a, b) => a - b);

  const barSlot = plotW / Math.max(m, 1);

  const ySvgMag = (v: number) => plotBottom - (v / yHi) * plotH;

  const lbl = svgLabelStyle(theme);
  const stride = labelStride(m, 10);

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${vbW} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Bar chart"
        style={{ display: "block", width: "100%" }}
      >
        {yTicks.map((v) => {
          const gy = ySvgMag(v);
          const isZero = Math.abs(v) < 1e-12;
          return (
            <g key={`b-yt-${v}`}>
              {isZero ? (
                <line
                  x1={plotLeft}
                  x2={vbW - right}
                  y1={gy}
                  y2={gy}
                  stroke={theme.stroke.secondary}
                  strokeWidth={1.75}
                />
              ) : gy <= plotBottom && gy >= plotTop ? (
                  <line
                    x1={plotLeft}
                    x2={vbW - right}
                    y1={gy}
                    y2={gy}
                    stroke={theme.stroke.tertiary}
                    strokeWidth={1}
                  />
              ) : null}
              <text
                  x={plotLeft - S2}
                  y={gy + 4}
                  textAnchor="end"
                  fill={theme.text.tertiary}
                  fontSize={CHART_SMALL_PX}
                  fontFamily={lbl.fontFamily}
                >
                  {formatAxisCompact(v)}
                </text>
            </g>
          );
        })}

        {cats.flatMap((_c, i) => {
          const gx0 = plotLeft + i * barSlot;
          const nbar = Math.max(series.length, 1);
          const gap = 4;
          const usable = Math.max(barSlot - gap * 2, 8);
          const bw = usable / Math.max(nbar, 1) - gap * 0.5;

          return series.map((s, si) => {
            const raw = s.data[i] ?? 0;
            const v = Number.isFinite(raw) && raw >= 0 ? raw : 0;
            const h = (v / yHi) * plotH;
          const x = gx0 + gap + si * (bw + gap);
            const fillCol = chartSeriesColour(theme, si);
            return (
              <rect
                key={`br-${si}-${i}`}
                x={x}
                y={plotBottom - h}
                width={Math.max(bw, 2)}
                height={Math.max(h, v > 0 ? 1 : 0)}
                rx={2}
                fill={fillCol}
              />
            );
          });
        })}

        {cats.map((cat, r) => {
          const gx = plotLeft + r * barSlot + barSlot / 2;
          return (
            <g key={cat}>
              {r % stride === 0 || r === m - 1 ? (
                <text
                  x={gx}
                  y={height - S1}
                  textAnchor="middle"
                  fill={theme.text.secondary}
                  fontSize={CHART_SMALL_PX}
                  fontFamily={lbl.fontFamily}
                >
                  {truncateCategoryLabel(cat)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {dlen >= 2 ? (
        <Row gap={S4} wrap style={{ marginTop: S2, paddingLeft: S1 }}>
          {series.map((s, i) => (
            <Row gap={S1_5} align="center" key={`${s.name}-${i}`}>
              <span
                style={{
                  width: 12,
                  height: 8,
                  backgroundColor: chartSeriesColour(theme, i),
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
              <Text size="small" tone="secondary">
                {s.name}
              </Text>
            </Row>
          ))}
        </Row>
      ) : null}
    </div>
  );
}

export default function SmePipelineBreakeven() {
  const theme = useHostTheme();
  const [tab, setTab] = useCanvasState<
    "howto" | "expenditure" | "pipeline" | "orderbook" | "liquidity"
  >("dash-tab", "expenditure");
  const [expenditureRows, setExpenditureRows] = useCanvasState<ExpenditureRow[]>(
    "expenditure-lines",
    cloneDefaultRows(),
  );
  /** Adds on top of OPEX (SAR/month): need = OPEX × (1 + this% ÷ 100), e.g. 10 → +10% to OPEX. */
  const [targetProfitOnOpexPct, setTargetProfitOnOpexPct] = useCanvasState(
    "input-target-profit-on-opex-pct",
    "0",
  );
  const [avgDealSar, setAvgDealSar] = useCanvasState("input-avg-deal", "500000");
  const [winRatePct, setWinRatePct] = useCanvasState("input-win-rate", "25");

  const [obOrderbookSar, setObOrderbookSar] = useCanvasState("ob-orderbook-sar", "50000000");
  const [obNumProjects, setObNumProjects] = useCanvasState("ob-num-projects", "5");
  const [obSubToContract, setObSubToContract] = useCanvasState("ob-sub-to-contract-mo", "2");
  const [obContractToCompletion, setObContractToCompletion] = useCanvasState(
    "ob-contract-to-completion-mo",
    "3",
  );
  const [obPayLag, setObPayLag] = useCanvasState("ob-payment-lag-mo", "1");
  const [obStagger, setObStagger] = useCanvasState("ob-stagger-submissions-mo", "1");
  const [obFirstSubmission, setObFirstSubmission] = useCanvasState(
    "ob-first-submission-mo",
    "1",
  );
  const [obHorizon, setObHorizon] = useCanvasState("ob-horizon-mo", "24");
  const [paymentLegRows, setPaymentLegRows] = useCanvasState<PaymentLegRow[]>(
    "orderbook-payment-legs",
    cloneDefaultPaymentLegs(3),
  );
  const [openingBalanceSar, setOpeningBalanceSar] = useCanvasState(
    "liquidity-opening-sar",
    "0",
  );
  /** Empty = default to Pipeline tab hurdle (M_need ≈ gross pipeline cash target SAR/month). */
  const [liquidityPipelineWonSarMo, setLiquidityPipelineWonSarMo] = useCanvasState(
    "liquidity-pipeline-won-sar-mo",
    "",
  );
  /**
   * Projects per win-month splitting pipeline SAR/month (same stagger as orderbook). Persist key still
   * `liquidity-pipeline-streams`; empty ⇒ orderbook project count (n, often 5).
   */
  const [liquidityPipelineProjects, setLiquidityPipelineProjects] = useCanvasState(
    "liquidity-pipeline-streams",
    "",
  );

  const monthlyTotal = sumExpenditureRows(expenditureRows);
  const targetOpexUpliftPct = parseNum(targetProfitOnOpexPct, 0);
  /** Pipeline hurdle (SAR/month): base OPEX plus target profit % on top of OPEX. */
  const pipelineMonthlyNeed =
    monthlyTotal * (1 + targetOpexUpliftPct / 100);

  const patchRow = (id: string, patch: Partial<Omit<ExpenditureRow, "id">>) => {
    setExpenditureRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const addExpenditureRow = () => {
    setExpenditureRows((rows) => [
      ...rows,
      {
        id: newRowId(),
        item: "New OPEX line",
        unitRateSar: "0",
        costDriverQty: "1",
      },
    ]);
  };

  const removeExpenditureRow = (id: string) => {
    setExpenditureRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  };

  const resetExpenditureRows = () => {
    setExpenditureRows(cloneDefaultRows());
  };

  const patchPaymentLeg = (id: string, patch: Partial<Omit<PaymentLegRow, "id">>) => {
    setPaymentLegRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const addPaymentLeg = () => {
    setPaymentLegRows((rows) => [
      ...rows,
      {
        id: newPaymentLegId(),
        label: "Payment",
        pct: "0",
        offsetMonths: "0",
      },
    ]);
  };

  const removePaymentLeg = (id: string) => {
    setPaymentLegRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  };

  const resetPaymentLegs = () => {
    setPaymentLegRows(cloneDefaultPaymentLegs(parseNum(obContractToCompletion, 3)));
  };

  const V = parseNum(avgDealSar, 500_000);
  const p = parseNum(winRatePct, 25) / 100;

  const winOk = p > 0 && p <= 1;
  const dealOk = V > 0;

  /** Won revenue required per month = pipeline hurdle M_need (SAR/month). */
  const requiredWonRevenueMonth = pipelineMonthlyNeed;
  /** Aggregate bid SAR/month so expected won revenue p × bids ≥ M_need. */
  const requiredBidVolumeSarMonth =
    winOk ? pipelineMonthlyNeed / p : Number.POSITIVE_INFINITY;
  const expectedWonRevenuePerSubmittedProposal =
    winOk && dealOk ? p * V : 0;
  const proposalsNeededMonth =
    expectedWonRevenuePerSubmittedProposal > 0
      ? pipelineMonthlyNeed / expectedWonRevenuePerSubmittedProposal
      : Number.POSITIVE_INFINITY;

  const parsedOrderbookLegs = parsePaymentLegRows(paymentLegRows);
  const paymentLegsFracSum = parsedOrderbookLegs.reduce((a, l) => a + l.frac, 0);

  const horizonMo = parseNum(obHorizon, 24);

  const orderbookSim = simulateOrderbookCash({
    orderbookSar: parseNum(obOrderbookSar, 50_000_000),
    numProjects: parseNum(obNumProjects, 5),
    submissionToContractMo: parseNum(obSubToContract, 2),
    contractToCompletionMo: parseNum(obContractToCompletion, 3),
    paymentLagAfterDueMo: parseNum(obPayLag, 1),
    staggerBetweenSubmissionsMo: parseNum(obStagger, 1),
    firstSubmissionMonth: parseNum(obFirstSubmission, 1),
    horizonMonths: horizonMo,
    legs: parsedOrderbookLegs,
  });

  const obProjCountParsed = parseNum(obNumProjects, 5);

  /** Pipeline intake notional SAR/month for the liquidity layer (≠ revenue recognition under IFRS/US GAAP—we model collections from partial billing milestones). */
  const liquidityMonthlyPipelineSar =
    liquidityPipelineWonSarMo.trim() === ""
      ? pipelineMonthlyNeed
      : parseNum(liquidityPipelineWonSarMo, pipelineMonthlyNeed);

  const liquidityPipelineProjectsCount =
    liquidityPipelineProjects.trim() === ""
      ? obProjCountParsed
      : parseNum(liquidityPipelineProjects, obProjCountParsed);

  const pipelineLiquiditySim = simulateMonthlyPipelineCash({
    horizonMonths: horizonMo,
    monthlyPipelineNotionalSar: liquidityMonthlyPipelineSar,
    parallelProjectsCount: liquidityPipelineProjectsCount,
    submissionToContractMo: parseNum(obSubToContract, 2),
    paymentLagAfterDueMo: parseNum(obPayLag, 1),
    staggerBetweenSubmissionsMo: parseNum(obStagger, 1),
    legs: parsedOrderbookLegs,
  });

  const liquidityCombinedCashIn = orderbookSim.monthly.map(
    (obM, idx) => obM + (pipelineLiquiditySim.monthly[idx] ?? 0),
  );
  /** Cumulative expected receipts: orderbook + pipeline cohort (per month). */
  const liquidityCumulativeCombinedReceipts = orderbookSim.cumulative.map(
    (cumOb, idx) => cumOb + (pipelineLiquiditySim.cumulative[idx] ?? 0),
  );

  const openingBalance = parseNum(openingBalanceSar, 0);
  const liquidityLen = orderbookSim.monthly.length;
  const monthlyCashOutFixed = monthlyTotal;
  const liquidityNet: number[] = [];
  const liquidityRunning: number[] = [];
  let runBal = openingBalance;
  for (let m = 0; m < liquidityLen; m++) {
    const cin = liquidityCombinedCashIn[m] ?? 0;
    const cout = monthlyCashOutFixed;
    const net = cin - cout;
    liquidityNet.push(net);
    runBal += net;
    liquidityRunning.push(runBal);
  }
  const firstDeficitMonth = liquidityRunning.findIndex((b) => b < 0);
  const endingBalance =
    liquidityRunning[liquidityRunning.length - 1] ?? openingBalance;

  /** Charts in the canvas runtime may not always repaint when `series` changes; remount on input revision. */
  const chartDataRevision = [
    obOrderbookSar,
    obNumProjects,
    obSubToContract,
    obContractToCompletion,
    obPayLag,
    obStagger,
    obFirstSubmission,
    obHorizon,
    String(monthlyTotal),
    openingBalanceSar,
    targetProfitOnOpexPct,
    avgDealSar,
    winRatePct,
    expenditureRows
      .map(
        (r) =>
          `${r.id}:${r.unitRateSar ?? r.amount ?? ""}:${r.costDriverQty ?? "1"}`,
      )
      .join(","),
    paymentLegRows.map((r) => `${r.id}:${r.pct}:${r.offsetMonths}:${r.label}`).join(";"),
    liquidityPipelineWonSarMo,
    liquidityPipelineProjects,
    String(pipelineMonthlyNeed),
  ].join("|");

  return (
    <Stack gap={20} style={{ maxWidth: 920 }}>
      <H1>SME SAR/month burn vs pipeline — break-even</H1>
      <Text tone="secondary">
        Expenditure, orderbook, and liquidity inputs persist in this browser. Pipeline sets M_need (SAR/month).
        Liquidity overlays pipeline cash from new wins (same partial payment cadence as the orderbook tab) on top
        of orderbook cash, then nets SAR/month burn over the horizon.
      </Text>

      <Row gap={8} align="center" wrap>
        <Pill active={tab === "howto"} onClick={() => setTab("howto")}>
          How to
        </Pill>
        <Pill active={tab === "expenditure"} onClick={() => setTab("expenditure")}>
          Expenditure
        </Pill>
        <Pill active={tab === "pipeline"} onClick={() => setTab("pipeline")}>
          Pipeline and proposals
        </Pill>
        <Pill active={tab === "orderbook"} onClick={() => setTab("orderbook")}>
          Orderbook and cash
        </Pill>
        <Pill active={tab === "liquidity"} onClick={() => setTab("liquidity")}>
          Balance
        </Pill>
      </Row>

      {tab === "howto" && (
        <Stack gap={16}>
          <Callout tone="info" title="Using this model">
            The four working tabs build on each other: set your monthly burn, then the pipeline hurdle, then how
            existing work pays you over time, then how new wins stack on top for cash timing. Everything you type
            is stored in this browser (local storage) until you clear site data.
          </Callout>

          <Card>
            <CardHeader>1 · Expenditure</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text tone="secondary" size="small">
                  Lists operating cash out in SAR/month (payroll, rent, debt service, etc.). The sum is your
                  baseline burn and feeds every other tab.
                </Text>
                <Text tone="secondary" size="small">
                  Add or remove lines, edit categories and amounts, use <Text weight="semibold">Reset template</Text>{" "}
                  to restore the starter rows. Numbers accept thousand separators.
                </Text>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>2 · Pipeline and proposals</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text tone="secondary" size="small">
                  Turns burn into a pipeline hurdle <Text weight="semibold">M_need</Text>: monthly OPEX plus an
                  optional target profit on top of OPEX. From win rate and average proposal size{" "}
                  <Text weight="semibold">V</Text>, you get bid envelope, required won revenue, and proposals per
                  month.
                </Text>
                <Text tone="secondary" size="small">
                  Use it to answer “what do we need to take to market each month?” at your stated conversion
                  assumptions. Transparent formulas show the algebra.
                </Text>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>3 · Orderbook and cash</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text tone="secondary" size="small">
                  Models cash in from work already in the orderbook: total contract value, number of projects,
                  submission stagger, contract and completion timing, and a payment-leg schedule (% of contract at
                  offsets in months, plus due-to-cash lag).
                </Text>
                <Text tone="secondary" size="small">
                  Outputs include per-project schedule, monthly and cumulative cash-in charts, and how much value
                  still falls after the horizon. Align legs to roughly 100% of contract so the schedule is complete.
                </Text>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>4 · Balance</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text tone="secondary" size="small">
                  Combines orderbook receipts with an additive pipeline layer (same payment-leg pattern as the
                  orderbook, with configurable SAR/month intake and projects splitting each win-month cohort).
                  Cash out is the expenditure burn; the chart and table show net flows and running cash balance from
                  an opening balance at month 0.
                </Text>
                <Text tone="secondary" size="small">
                  Use it for liquidity timing: when cumulative inflows minus burn crosses zero, and how pipeline
                  assumptions change the path. This is a cash collection view, not IFRS/US GAAP revenue recognition.
                </Text>
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      )}

      {tab === "expenditure" && (
        <Stack gap={16}>
          <Grid columns={3} gap={16}>
            <Stat
              value={SAR.format(monthlyTotal)}
              label="Total cash out (SAR/month)"
              tone="warning"
            />
            <Stat value={SAR.format(monthlyTotal * 12)} label="Annualized (SAR)" />
            <Stat value="80" label="Headcount (for context)" />
          </Grid>
          <Callout tone="info">
            Edit any line item below. Monthly OPEX is calculated as unit rate × cost driver volume. Add or
            remove lines; use Reset to restore the original template.
          </Callout>
          <Card>
            <CardHeader
              trailing={
                <Row gap={8} align="center" wrap>
                  <Button variant="ghost" onClick={resetExpenditureRows}>
                    Reset template
                  </Button>
                  <Button variant="secondary" onClick={addExpenditureRow}>
                    Add line
                  </Button>
                </Row>
              }
            >
              OPEX line build-up (SAR/month)
            </CardHeader>
            <CardBody style={{ paddingTop: 0 }}>
              <Stack gap={0}>
                <Row
                  gap={8}
                  align="center"
                  style={{
                    padding: "8px 0",
                    borderBottom: `1px solid ${theme.stroke.tertiary}`,
                  }}
                >
                  <Text
                    size="small"
                    tone="secondary"
                    weight="semibold"
                    style={{ flex: "2 1 220px", minWidth: 0 }}
                  >
                    Item
                  </Text>
                  <Text
                    size="small"
                    tone="secondary"
                    weight="semibold"
                    style={{ width: 140, flexShrink: 0, textAlign: "right" }}
                  >
                    Unit rate (SAR)
                  </Text>
                  <Text
                    size="small"
                    tone="secondary"
                    weight="semibold"
                    style={{ width: 140, flexShrink: 0, textAlign: "right" }}
                  >
                    Cost driver volume
                  </Text>
                  <Text
                    size="small"
                    tone="secondary"
                    weight="semibold"
                    style={{ width: 160, flexShrink: 0, textAlign: "right" }}
                  >
                    Line OPEX (SAR/month)
                  </Text>
                  <span style={{ width: 72, flexShrink: 0 }} />
                </Row>
                {expenditureRows.map((row, i) => (
                  <Row
                    key={row.id}
                    gap={8}
                    align="center"
                    style={{
                      padding: "10px 0",
                      borderBottom: `1px solid ${theme.stroke.tertiary}`,
                      background: i % 2 === 1 ? theme.fill.quaternary : undefined,
                    }}
                  >
                    <TextInput
                      value={row.item ?? row.category ?? ""}
                      onChange={(v) => patchRow(row.id, { item: v })}
                      placeholder="Item"
                      style={{ flex: "2 1 220px", minWidth: 0 }}
                    />
                    <NumericTextInput
                      allowDecimal
                      value={row.unitRateSar ?? row.amount ?? ""}
                      onChange={(v) => patchRow(row.id, { unitRateSar: v })}
                      placeholder="0"
                      style={{ width: 140, flexShrink: 0 }}
                    />
                    <NumericTextInput
                      allowDecimal
                      value={row.costDriverQty ?? "1"}
                      onChange={(v) => patchRow(row.id, { costDriverQty: v })}
                      placeholder="0"
                      style={{ width: 140, flexShrink: 0 }}
                    />
                    <Text
                      size="small"
                      tone="secondary"
                      style={{ width: 160, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                    >
                      {SAR.format(Math.round(expenditureLineTotalSar(row)))}
                    </Text>
                    <Button
                      variant="ghost"
                      onClick={() => removeExpenditureRow(row.id)}
                      disabled={expenditureRows.length <= 1}
                    >
                      Remove
                    </Button>
                  </Row>
                ))}
              </Stack>
            </CardBody>
          </Card>
          <Row gap={8} align="center">
            <Text weight="semibold">Sum</Text>
            <Spacer />
            <Text weight="semibold">{SAR.format(monthlyTotal)} SAR/month</Text>
          </Row>
        </Stack>
      )}

      {tab === "pipeline" && (
        <Stack gap={16}>
          <Grid columns={2} gap={16}>
            <Stat value={SAR.format(monthlyTotal)} label="OPEX (SAR/month expenditure sum)" />
            <Stat
              value={SAR.format(pipelineMonthlyNeed)}
              label="Pipeline need M_need (SAR/month)"
              tone="warning"
            />
            <Stat
              value={
                winOk && Number.isFinite(requiredBidVolumeSarMonth)
                  ? SAR.format(Math.ceil(requiredBidVolumeSarMonth))
                  : "—"
              }
              label="Bid value to submit · SAR/month (at stated win rate %)"
              tone="info"
            />
            <Stat
              value={SAR.format(Math.round(requiredWonRevenueMonth))}
              label="Won revenue SAR/month (= M_need)"
            />
          </Grid>

          <Card>
            <CardHeader trailing={<Text size="small" tone="secondary">All SAR</Text>}>
              Assumptions
            </CardHeader>
            <CardBody>
              <Stack gap={12}>
                <Row gap={16} align="start" wrap>
                  <Stack gap={4} style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <Text size="small" tone="secondary">
                      Target profit (% stacked on SAR/month OPEX)
                    </Text>
                    <NumericTextInput
                      allowDecimal
                      value={targetProfitOnOpexPct}
                      onChange={setTargetProfitOnOpexPct}
                      placeholder="0"
                    />
                  </Stack>
                  <Stack gap={4} style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <Text size="small" tone="secondary">
                      Average proposal size V (SAR per bid)
                    </Text>
                    <NumericTextInput
                      allowDecimal
                      value={avgDealSar}
                      onChange={setAvgDealSar}
                      placeholder={formatIntGroupedPlaceholderEn(500000)}
                    />
                  </Stack>
                  <Stack gap={4} style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <Text size="small" tone="secondary">
                      Win rate (% of bids you expect to win)
                    </Text>
                    <NumericTextInput
                      allowDecimal
                      value={winRatePct}
                      onChange={setWinRatePct}
                      placeholder={formatNumericInputEnglish("25", { allowDecimal: true })}
                    />
                  </Stack>
                </Row>
              </Stack>
            </CardBody>
          </Card>

          <H2>Transparent formulas</H2>
          <Stack gap={8}>
            <Text>
              Let <Text weight="semibold">M_opex</Text> = expenditure sum (SAR/month),{" "}
              <Text weight="semibold">t</Text> = target profit on OPEX (% ÷ 100),{" "}
              <Text weight="semibold">M_need</Text> = M_opex × (1 + t) (SAR/month),{" "}
              <Text weight="semibold">V</Text> = average proposal size (SAR/bid),{" "}
              <Text weight="semibold">p</Text> = win rate (win % ÷ 100).
            </Text>
            <Code>{`M_opex = ${SAR.format(monthlyTotal)} SAR/month`}</Code>
            <Code>{`M_need = M_opex × (1 + target_profit_on_opex_% ÷ 100) = ${SAR.format(Math.round(pipelineMonthlyNeed))} SAR/month`}</Code>
            <Code>{`Won_revenue_required_per_month = M_need`}</Code>
            <Code>{`p = win_rate_% ÷ 100`}</Code>
            <Code>{`Bid_value_submit_per_month = M_need ÷ p`}</Code>
            <Code>{`Proposals_per_month = M_need ÷ (p × V)`}</Code>
            <Code>{`Expected_won_revenue_per_submitted_proposal = p × V`}</Code>
          </Stack>

          <Divider />

          <H3>Results (from your inputs)</H3>
          {!winOk ? (
            <Callout tone="warning">
              Set win rate as a percent (0–100, not 0%) so bid envelope and proposals can be
              sized against M_need.
            </Callout>
          ) : null}
          <Stack gap={12}>
            {!dealOk ? (
              <Callout tone="info">
                Add a positive average proposal size to estimate proposals / month
                (= M_need ÷ (p × V)).
              </Callout>
            ) : null}
            <Table
              headers={["Metric", "Value", "Notes"]}
              rows={[
                [
                  "OPEX (base) SAR/month",
                  SAR.format(monthlyTotal),
                  "Sum of expenditure tab",
                ],
                [
                  "Pipeline need M_need (SAR/month)",
                  SAR.format(Math.round(pipelineMonthlyNeed)),
                  `OPEX × (1 + ${targetOpexUpliftPct}% ÷ 100)`,
                ],
                [
                  "Won revenue SAR/month required",
                  SAR.format(Math.round(requiredWonRevenueMonth)),
                  "Equals M_need (full pipeline hurdle treated as SAR/month won turnover)",
                ],
                [
                  "Bid value to submit SAR/month",
                  winOk && Number.isFinite(requiredBidVolumeSarMonth)
                    ? SAR.format(Math.ceil(requiredBidVolumeSarMonth))
                    : "—",
                  winOk
                    ? "So expected wins p × bid SAR ≥ M_need in aggregate"
                    : "Needs win rate",
                ],
                [
                  "Submitted proposals per month",
                  dealOk && winOk && Number.isFinite(proposalsNeededMonth)
                    ? proposalsNeededMonth.toLocaleString("en-SA", {
                        maximumFractionDigits: 1,
                      })
                    : "—",
                  dealOk && winOk
                    ? `M_need ÷ (p × V); each bid expects p·V won SAR (rate view is SAR/month)`
                    : "Needs V and valid win rate",
                ],
                [
                  "Expected won revenue per submitted proposal (size V)",
                  dealOk && winOk
                    ? SAR.format(Math.round(expectedWonRevenuePerSubmittedProposal))
                    : "—",
                  dealOk && winOk ? `p × V` : "Needs V and valid win rate",
                ],
              ]}
              columnAlign={["left", "right", "left"]}
              striped
            />
          </Stack>

          <Text tone="tertiary" size="small">
            Won revenue target is pipeline M_need in SAR/month (no separate profit-share haircut). Bid and
            proposal counts use win rate against that need. Balance tab still burns raw OPEX SAR/month only.
          </Text>
        </Stack>
      )}

      {tab === "orderbook" && (
        <Stack gap={16}>
          <Grid columns={3} gap={16}>
            <Stat
              value={SAR.format(orderbookSim.totalBook)}
              label="Orderbook (contract value)"
              tone="info"
            />
            <Stat
              value={SAR.format(orderbookSim.cumulative[orderbookSim.cumulative.length - 1] ?? 0)}
              label={`Cash in ${monthOrdinal(0)}–${monthOrdinal(orderbookSim.monthly.length - 1)}`}
              tone="success"
            />
            <Stat
              value={
                orderbookSim.afterHorizon > 0
                  ? SAR.format(orderbookSim.afterHorizon)
                  : "0"
              }
              label="Still due after horizon"
              tone="warning"
            />
          </Grid>

          <Callout tone="info" title="Timing model">
            Each project has the same value (orderbook ÷ count). Submission ordinal for project k is
            first submission + k × stagger. Contract = submission + submission-to-contract delay (months).
            Partial payments set each leg’s share (% of contract) and offset in months from the contract award;
            cash settles due + global “Due → cash lag”. Index month 0 is the first step in the horizon.
          </Callout>

          <Card>
            <CardHeader trailing={<Text size="small" tone="secondary">SAR</Text>}>
              Parameters
            </CardHeader>
            <CardBody>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <OrderbookParamCell label="Orderbook">
                  <NumericTextInput
                    value={obOrderbookSar}
                    onChange={setObOrderbookSar}
                    style={{ width: "100%" }}
                  />
                </OrderbookParamCell>
                <OrderbookParamCell label="Projects">
                  <NumericTextInput
                    value={obNumProjects}
                    onChange={setObNumProjects}
                    style={{ width: "100%" }}
                  />
                </OrderbookParamCell>
                <OrderbookParamCell label="Submission → contract (months)">
                  <NumericTextInput
                    value={obSubToContract}
                    onChange={setObSubToContract}
                    style={{ width: "100%" }}
                  />
                </OrderbookParamCell>
                <OrderbookParamCell label="Contract → completion (months)">
                  <NumericTextInput
                    value={obContractToCompletion}
                    onChange={setObContractToCompletion}
                    style={{ width: "100%" }}
                  />
                </OrderbookParamCell>
                <OrderbookParamCell label="Due → cash lag (months)">
                  <NumericTextInput
                    value={obPayLag}
                    onChange={setObPayLag}
                    style={{ width: "100%" }}
                  />
                </OrderbookParamCell>
                <OrderbookParamCell label="Stagger submissions (months)">
                  <NumericTextInput
                    value={obStagger}
                    onChange={setObStagger}
                    style={{ width: "100%" }}
                  />
                </OrderbookParamCell>
                <OrderbookParamCell label="First project submission (months)">
                  <NumericTextInput
                    value={obFirstSubmission}
                    onChange={setObFirstSubmission}
                    style={{ width: "100%" }}
                  />
                </OrderbookParamCell>
                <OrderbookParamCell label="Horizon (months)">
                  <NumericTextInput
                    value={obHorizon}
                    onChange={setObHorizon}
                    style={{ width: "100%" }}
                  />
                </OrderbookParamCell>
              </div>
            </CardBody>
          </Card>

          {Math.abs(paymentLegsFracSum - 1) > 0.02 ? (
            <Callout tone="warning">
              Payment leg shares sum to{" "}
              {(paymentLegsFracSum * 100).toLocaleString("en-SA", { maximumFractionDigits: 2 })}%
              (expect ~100% so each project’s contract value is fully scheduled).
            </Callout>
          ) : null}

          <Card>
            <CardHeader
              trailing={
                <Row gap={8} align="center" wrap>
                  <Button variant="ghost" onClick={resetPaymentLegs}>
                    Reset payment template
                  </Button>
                  <Button variant="secondary" onClick={addPaymentLeg}>
                    Add leg
                  </Button>
                </Row>
              }
            >
              Partial contract payments (per project)
            </CardHeader>
            <CardBody style={{ paddingTop: 0 }}>
              <Stack gap={0}>
                <Row
                  gap={8}
                  align="center"
                  style={{
                    padding: "8px 0",
                    borderBottom: `1px solid ${theme.stroke.tertiary}`,
                  }}
                >
                  <Text
                    size="small"
                    tone="secondary"
                    weight="semibold"
                    style={{ flex: "2 1 140px", minWidth: 0 }}
                  >
                    Label
                  </Text>
                  <Text
                    size="small"
                    tone="secondary"
                    weight="semibold"
                    style={{ width: 88, flexShrink: 0, textAlign: "right" }}
                  >
                    Share %
                  </Text>
                  <Text
                    size="small"
                    tone="secondary"
                    weight="semibold"
                    style={{ width: 120, flexShrink: 0, textAlign: "right" }}
                  >
                    Due (+months from contract)
                  </Text>
                  <Text
                    size="small"
                    tone="secondary"
                    weight="semibold"
                    style={{ width: 100, flexShrink: 0, textAlign: "right" }}
                  >
                    Cash (+months from contract)
                  </Text>
                  <span style={{ width: 72, flexShrink: 0 }} />
                </Row>
                {paymentLegRows.map((row, i) => {
                  const off = Math.round(parseNum(row.offsetMonths, 0));
                  const lag = parseNum(obPayLag, 1);
                  return (
                    <Row
                      key={row.id}
                      gap={8}
                      align="center"
                      style={{
                        padding: "10px 0",
                        borderBottom: `1px solid ${theme.stroke.tertiary}`,
                        background: i % 2 === 1 ? theme.fill.quaternary : undefined,
                      }}
                    >
                      <TextInput
                        value={row.label}
                        onChange={(v) => patchPaymentLeg(row.id, { label: v })}
                        placeholder="Label"
                        style={{ flex: "2 1 140px", minWidth: 0 }}
                      />
                      <NumericTextInput
                        allowDecimal
                        value={row.pct}
                        onChange={(v) => patchPaymentLeg(row.id, { pct: v })}
                        placeholder="0"
                        style={{ width: 88, flexShrink: 0 }}
                      />
                      <NumericTextInput
                        allowMinus
                        value={row.offsetMonths}
                        onChange={(v) => patchPaymentLeg(row.id, { offsetMonths: v })}
                        placeholder="0"
                        style={{ width: 120, flexShrink: 0 }}
                      />
                      <Text size="small" tone="secondary" style={{ width: 100, textAlign: "right" }}>
                        {off + lag}
                      </Text>
                      <Button
                        variant="ghost"
                        onClick={() => removePaymentLeg(row.id)}
                        disabled={paymentLegRows.length <= 1}
                      >
                        Remove
                      </Button>
                    </Row>
                  );
                })}
              </Stack>
            </CardBody>
          </Card>

          <H2>Current projects (schedule)</H2>
          <Table
            headers={["Project", "Submit (month)", "Contract (month)", "Complete (month)", "Value (SAR)"]}
            rows={orderbookSim.rows.map((r) => [
              String(r.projectIndex),
              String(r.submissionMonth),
              String(r.contractMonth),
              String(r.completionMonth),
              SAR.format(r.valueSar),
            ])}
            columnAlign={["left", "right", "right", "right", "right"]}
            striped
          />

          <Stat
            value={`${orderbookSim.winToFirstCashLag} months`}
            label="Lag (months): project 1 submit → first cash"
          />

          <H2>Payment legs (per project)</H2>
          <Table
            headers={["Leg", "Share", "Due (months from contract)", "Cash (months from contract)"]}
            rows={orderbookSim.legs.map((leg) => [
              leg.label,
              `${leg.frac * 100}%`,
              String(leg.offsetFromContract),
              String(leg.offsetFromContract + parseNum(obPayLag, 1)),
            ])}
            columnAlign={["left", "right", "right", "right"]}
          />

          <H2>Cash in by month</H2>
          <AxisBarChart
            key={`ob-in-${chartDataRevision}`}
            categories={orderbookSim.categories}
            series={[{ name: "Orderbook cash received", data: orderbookSim.monthly, tone: "success" }]}
            height={220}
          />

          <H2>Cumulative cash</H2>
          <AxisLineChart
            key={`ob-cum-${chartDataRevision}`}
            categories={orderbookSim.categories}
            series={[
              { name: "Cumulative orderbook inflows", data: orderbookSim.cumulative, tone: "success" },
            ]}
            height={200}
            fill
          />

          <H3>Period detail (first 18 months)</H3>
          <Table
            headers={["Month", "Cash (SAR)", "Cumulative (SAR)"]}
            rows={orderbookSim.monthly.slice(0, 19).map((v, m) => [
              monthOrdinal(m),
              SAR.format(v),
              SAR.format(orderbookSim.cumulative[m] ?? 0),
            ])}
            columnAlign={["left", "right", "right"]}
            striped
            emptyMessage="Extend horizon (months) to see rows."
          />

          <Code>{`Per project = orderbook / n = ${SAR.format(orderbookSim.perProject)}`}</Code>
          <Text tone="tertiary" size="small">
            If your workbook’s total win-to-cash lag—e.g. 6 months—differs from the month span from project 1
            submission to first cash above, adjust first submission,
            submission→contract, payment legs, or payment lag until it matches your definition
            of “win”.
          </Text>
        </Stack>
      )}

      {tab === "liquidity" && (
        <Stack gap={16}>
          <Callout tone="info" title="What this tab does">
            Cash in each horizon step sums orderbook receipts (Orderbook tab) plus pipeline receipts (same leg
            pattern as Orderbook). Cash out is SAR/month burn. Net is operating cash flow before financing.
            Indices {monthOrdinal(0)}…{monthOrdinal(liquidityLen - 1)} span the orderbook horizon; closing balance builds from opening balance at {monthOrdinal(0)} plus
            each month&apos;s flows.
          </Callout>

          <Card>
            <CardHeader trailing={<Text size="small" tone="secondary">SAR</Text>}>
              Opening position
            </CardHeader>
            <CardBody>
              <Stack gap={4} style={{ maxWidth: 320 }}>
                <Text size="small" tone="secondary">
                  Current cash balance at start of month 0 (negative allowed)
                </Text>
                <NumericTextInput
                  allowMinus
                  value={openingBalanceSar}
                  onChange={setOpeningBalanceSar}
                  placeholder="0"
                />
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader trailing={<Text size="small" tone="secondary">SAR/month</Text>}>
              Pipeline (additive on top of orderbook)
            </CardHeader>
            <CardBody>
              <Grid columns={2} gap={16}>
                <Stack gap={4}>
                  <Text size="small" tone="secondary">
                    Pipeline SAR/month — won intake notional; empty ⇒ M_need {SAR.format(pipelineMonthlyNeed)}
                  </Text>
                  <NumericTextInput
                    value={liquidityPipelineWonSarMo}
                    onChange={setLiquidityPipelineWonSarMo}
                    placeholder={formatIntGroupedPlaceholderEn(Math.round(pipelineMonthlyNeed))}
                  />
                </Stack>
                <Stack gap={4}>
                  <Text size="small" tone="secondary">
                    Projects per win-month cohort split that SAR/month notional evenly (same stagger as orderbook;
                    empty ⇒ n = {Math.round(obProjCountParsed)})
                  </Text>
                  <NumericTextInput
                    value={liquidityPipelineProjects}
                    onChange={setLiquidityPipelineProjects}
                    placeholder={formatIntGroupedPlaceholderEn(Math.round(obProjCountParsed))}
                  />
                </Stack>
              </Grid>
            </CardBody>
          </Card>

          <Grid columns={3} gap={16}>
            <Stat value={SAR.format(openingBalance)} label="Opening balance (month 0)" />
            <Stat
              value={SAR.format(monthlyCashOutFixed)}
              label="Cash out — burn SAR/month"
              tone="warning"
            />
            <Stat
              value={SAR.format(endingBalance)}
              label={`Closing balance · end ${monthOrdinal(liquidityLen - 1)}`}
              tone={endingBalance < 0 ? "danger" : "success"}
            />
          </Grid>

          <Grid columns={3} gap={16}>
            <Stat
              value={SAR.format(liquidityMonthlyPipelineSar)}
              label="Pipeline SAR/month (per win-month cohort)"
              tone="secondary"
            />
            <Stat
              value={`${Math.round(liquidityPipelineProjectsCount)} projects`}
              label="Projects splitting each cohort"
              tone="secondary"
            />
            <Stat
              value={paymentLegsFracSum > 1.005 || paymentLegsFracSum < 0.995 ? "≠ 100%" : "≈100%"}
              label="Payment leg % sum (award basis)"
              tone={
                paymentLegsFracSum > 1.005 || paymentLegsFracSum < 0.995 ? "danger" : "success"
              }
            />
          </Grid>

          {firstDeficitMonth >= 0 ? (
            <Stat
              value={monthOrdinal(firstDeficitMonth)}
              label="First month-end closing below zero"
              tone="warning"
            />
          ) : (
            <Stat value="None" label="First month-end below zero (in horizon)" tone="success" />
          )}

          <H2>Cash in vs cash out · by month</H2>
          <AxisLineChart
            key={`liq-io-${chartDataRevision}`}
            categories={orderbookSim.categories}
            series={[
              {
                name: "Cash in · orderbook",
                data: orderbookSim.monthly,
                tone: "success",
              },
              {
                name: "Cash in · pipeline",
                data: pipelineLiquiditySim.monthly,
                tone: "info",
              },
              {
                name: "Cash in · total",
                data: liquidityCombinedCashIn,
                tone: "warning",
              },
              {
                name: "Cash out (burn)",
                data: orderbookSim.monthly.map(() => monthlyCashOutFixed),
                tone: "danger",
              },
            ]}
            height={260}
          />

          <H2>Cumulative · receipts and cash balance</H2>
          <Text size="small" tone="secondary">
            Legend reads left to right: orderbook cumulative → pipeline cumulative → combined receipts →
            closing cash balance. Each series uses a distinct line colour (no duplicate tones within the
            chart).
          </Text>
          <AxisLineChart
            key={`liq-cum-merge-${chartDataRevision}`}
            categories={orderbookSim.categories}
            series={[
              {
                name: "Cumulative orderbook cash in",
                data: orderbookSim.cumulative,
                tone: "success",
              },
              {
                name: "Cumulative pipeline cash",
                data: pipelineLiquiditySim.cumulative,
                tone: "neutral",
              },
              {
                name: "Cumulative total cash in",
                data: liquidityCumulativeCombinedReceipts,
                tone: "warning",
              },
              {
                name: "Cash balance",
                data: liquidityRunning,
                tone: endingBalance < 0 ? "danger" : "info",
              },
            ]}
            height={260}
          />

          <H3>Period detail (first 19 months)</H3>
          <Table
            headers={["Month", "Orderbook in", "Pipeline in", "In total", "Out", "Net", "Running"]}
            rows={orderbookSim.monthly.slice(0, 19).map((obIn, m) => {
              const pIn = pipelineLiquiditySim.monthly[m] ?? 0;
              const tot = liquidityCombinedCashIn[m] ?? 0;
              return [
                monthOrdinal(m),
                SAR.format(obIn),
                SAR.format(pIn),
                SAR.format(tot),
                SAR.format(monthlyCashOutFixed),
                SAR.format(liquidityNet[m] ?? 0),
                SAR.format(liquidityRunning[m] ?? 0),
              ];
            })}
            columnAlign={["left", "right", "right", "right", "right", "right", "right"]}
            striped
          />

          <Code>{`cashIn_month = orderbook_month + pipeline_month ;  Balance(end month h) = opening@month 0 + Σ_{j=0..h} ( cashIn_month_j − burn_SAR_month )`}</Code>
        </Stack>
      )}
    </Stack>
  );
}
