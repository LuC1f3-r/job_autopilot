type Props = {
  percent: number;
  size?: number;
};

/** Circular completion indicator. Track uses accent-light, fill color scales with percent. */
export function ProgressRing({ percent, size = 88 }: Props) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const fillColor =
    percent >= 80 ? "var(--color-success)" : percent >= 50 ? "var(--color-error)" : "var(--color-warning)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-error)"
          strokeOpacity={0.15}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-xl font-bold text-text-primary">{percent}%</span>
    </div>
  );
}
