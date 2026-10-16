import { STATUS_META } from '../lib/status';
import Icon from './Icon';

// Status is always text + a coloured dot, never colour alone.
export default function StatusBadge({ status }) {
  if (status === 'Stale') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-status-interview px-2 py-0.5 text-[12px] font-medium text-ink-soft">
        <Icon name="clock" className="h-3 w-3 text-status-interview" strokeWidth={2} />
        Follow up
      </span>
    );
  }

  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-2 py-0.5 text-[12px] font-medium text-ink-soft">
      <span className={`h-1.5 w-1.5 rounded-full ${meta ? meta.dot : 'bg-ink-faint'}`} aria-hidden="true" />
      {meta ? meta.label : status}
    </span>
  );
}
