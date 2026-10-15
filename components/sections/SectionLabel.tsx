export function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-muted md:mb-12">
      <span className="text-accent">{index}</span>
      <span className="h-px w-10 bg-line" />
      <span>{children}</span>
    </div>
  );
}
