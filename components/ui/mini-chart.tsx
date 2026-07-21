import type { SVGProps } from "react";

export type MiniChartTrend = "auto" | "up" | "down" | "flat";

export interface MiniChartProps
  extends Omit<SVGProps<SVGSVGElement>, "data" | "height" | "width"> {
  data: readonly number[];
  label?: string;
  width?: number;
  height?: number;
  trend?: MiniChartTrend;
  showPoints?: boolean;
}

function inferTrend(data: readonly number[]): Exclude<MiniChartTrend, "auto"> {
  if (data.length < 2 || data[0] === data[data.length - 1]) {
    return "flat";
  }

  return data[data.length - 1] > data[0] ? "up" : "down";
}

export function MiniChart({
  data,
  label = "Trend",
  width = 176,
  height = 56,
  trend = "auto",
  showPoints = false,
  className,
  "aria-label": ariaLabel,
  ...props
}: MiniChartProps) {
  const safeData = data.filter(Number.isFinite);
  const resolvedTrend = trend === "auto" ? inferTrend(safeData) : trend;
  const padding = 3;
  const baseline = height - padding;
  const minimum = safeData.length ? Math.min(...safeData) : 0;
  const maximum = safeData.length ? Math.max(...safeData) : 0;
  const range = maximum - minimum || 1;
  const chartWidth = Math.max(width - padding * 2, 1);
  const chartHeight = Math.max(height - padding * 2, 1);
  const points = safeData.map((datum, index) => {
    const x =
      safeData.length === 1
        ? width / 2
        : padding + (index / (safeData.length - 1)) * chartWidth;
    const y = padding + ((maximum - datum) / range) * chartHeight;
    return { datum, x, y };
  });
  const pointList = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPath = points.length
    ? `M ${points[0].x} ${baseline} L ${pointList.replaceAll(
        " ",
        " L ",
      )} L ${points[points.length - 1].x} ${baseline} Z`
    : "";
  const description = safeData.length
    ? `${label}: ${resolvedTrend} trend across ${safeData.length} data points, from ${safeData[0]} to ${safeData[safeData.length - 1]}.`
    : `${label}: no trend data available.`;

  return (
    <svg
      {...props}
      className={[
        "mini-chart",
        `mini-chart--${resolvedTrend}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? description}
      data-trend={resolvedTrend}
      data-empty={safeData.length === 0 ? "true" : undefined}
    >
      <title>{ariaLabel ?? description}</title>
      {points.length ? (
        <>
          <path className="mini-chart__area" d={areaPath} />
          {points.length === 1 ? (
            <circle
              className="mini-chart__point mini-chart__point--single"
              cx={points[0].x}
              cy={points[0].y}
              r="2.5"
            />
          ) : (
            <polyline
              className="mini-chart__line"
              points={pointList}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {showPoints
            ? points.map(({ datum, x, y }, index) => (
                <circle
                  className="mini-chart__point"
                  cx={x}
                  cy={y}
                  r="2"
                  key={`${index}-${datum}`}
                />
              ))
            : null}
        </>
      ) : (
        <line
          className="mini-chart__empty-line"
          x1={padding}
          x2={width - padding}
          y1={height / 2}
          y2={height / 2}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
