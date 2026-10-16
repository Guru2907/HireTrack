import Icon from './Icon';

// Shared frame for the login and signup pages.
export default function AuthFrame({ eyebrow, title, subtitle, error, children, footer }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="font-display text-[44px] leading-[1.02] text-ink sm:text-[52px]">{title}</h1>
        <p className="mb-8 mt-3 text-[15px] text-ink-muted">{subtitle}</p>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-[5px] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-md border border-line bg-paper-raised p-6 sm:p-7">{children}</div>
        <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>
      </div>
    </div>
  );
}
