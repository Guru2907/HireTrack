export default function EmptyState({ eyebrow, title, description, children }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-paper-raised px-6 py-14 text-center">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="font-display text-[30px] leading-tight text-ink">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
