export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium tracking-wide text-text-secondary uppercase">
      {children}
    </label>
  );
}
