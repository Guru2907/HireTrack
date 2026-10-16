// Editorial page masthead: small eyebrow, large serif title, optional description and actions, closed by a rule.
export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-8 border-b border-ink pb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="font-display text-[40px] leading-[1.02] tracking-[-0.01em] text-ink sm:text-[52px]">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
