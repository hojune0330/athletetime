export type RecordDirection = 'lower' | 'higher';

export type CompareChartPoint = {
  readonly date: string;
  readonly value: number;
};

export type CompareChartSeries = {
  readonly athleteKey: string;
  readonly name: string;
  readonly color: string;
  readonly points: readonly CompareChartPoint[];
};

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = 28;

export function CompareChart({
  series,
  direction,
  ariaLabel,
}: {
  readonly series: readonly CompareChartSeries[];
  readonly direction: RecordDirection;
  readonly ariaLabel: string;
}) {
  const allPoints = series.flatMap((item) => item.points);
  const dates = allPoints.map((point) => new Date(point.date).getTime()).filter(Number.isFinite);
  const values = allPoints.map((point) => point.value);
  const minX = Math.min(...dates);
  const maxX = Math.max(...dates);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spanX = maxX - minX || 1;
  const spanValue = maxValue - minValue || 1;
  const xFor = (timestamp: number) => PADDING + ((timestamp - minX) / spanX) * (WIDTH - PADDING * 2);
  const yFor = (value: number) => {
    const normalized = (value - minValue) / spanValue;
    const upwardValue = direction === 'lower' ? normalized : 1 - normalized;
    return PADDING + upwardValue * (HEIGHT - PADDING * 2);
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={ariaLabel}>
        {series.map((item) => {
          const points = item.points
            .map((point) => ({ x: xFor(new Date(point.date).getTime()), y: yFor(point.value) }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
          if (points.length === 0) return null;
          const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
          return (
            <g key={item.athleteKey}>
              {points.length >= 2 ? <path d={path} fill="none" stroke={item.color} strokeWidth={2} /> : null}
              {points.map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r={3} fill={item.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3">
        {series.map((item) => (
          <span key={item.athleteKey} className="inline-flex items-center gap-1.5 text-xs text-ink-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}
