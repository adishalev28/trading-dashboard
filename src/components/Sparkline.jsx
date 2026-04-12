/**
 * Mini price chart — pure SVG, no dependencies
 * Shows 30-day close price trend as a polyline with optional gradient fill
 *
 * Props:
 *   data:   number[] (array of close prices, oldest to newest)
 *   width:  px (default 100)
 *   height: px (default 32)
 *   color:  override color, or auto-detect from trend (green if up, red if down)
 */
export default function Sparkline({ data, width = 100, height = 32, color }) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-slate-800 rounded" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoid division by zero

  // Map data points to SVG coordinates
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2; // 2px padding
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylinePoints = points.join(" ");

  // Auto-detect color from trend (first vs last value)
  const trending = data[data.length - 1] >= data[0];
  const lineColor = color || (trending ? "#10b981" : "#f43f5e"); // emerald / rose
  const fillColor = trending ? "#10b98120" : "#f43f5e20"; // transparent version

  // Build fill polygon (polyline + bottom edge)
  const fillPoints = `0,${height} ${polylinePoints} ${width},${height}`;

  // Unique ID for gradient
  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      style={{ display: "block" }}
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <polygon
        points={fillPoints}
        fill={`url(#${gradId})`}
      />

      {/* Price line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Current price dot (last point) */}
      {(() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
        return (
          <circle
            cx={lastX}
            cy={lastY}
            r="2"
            fill={lineColor}
          />
        );
      })()}
    </svg>
  );
}
