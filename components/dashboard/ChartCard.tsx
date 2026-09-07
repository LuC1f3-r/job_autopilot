type Props = {
  title: string;
  children: React.ReactNode;
};

/** Shared white-card shell wrapping every chart/list panel on the dashboard. */
export function ChartCard({ title, children }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}
