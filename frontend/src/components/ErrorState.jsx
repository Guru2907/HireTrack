import Button from './Button';
import Icon from './Icon';

// Shown when data failed to load, so a failed request is never mistaken for "no data".
export default function ErrorState({ title = "We couldn't load this", message, onRetry }) {
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-6 py-10 text-center">
      <Icon name="alert" className="mx-auto mb-3 h-6 w-6 text-danger" />
      <h2 className="font-display text-[26px] leading-tight text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
        {message || 'Check your connection and try again. Your data has not been changed.'}
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <Icon name="refresh" />
          Try again
        </Button>
      )}
    </div>
  );
}
