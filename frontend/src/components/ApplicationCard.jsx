import StatusBadge from './StatusBadge';
import Icon from './Icon';
import { STATUSES, STATUS_META, isStale } from '../lib/status';
import { formatDate, relativeTime } from '../lib/dates';

// Inline status control: changes are saved immediately by the page (PUT /applications/:id { status }).
export function StatusSelect({ app, onChange, saving }) {
  return (
    <div className="relative inline-flex">
      <span className={`pointer-events-none absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${STATUS_META[app.status]?.dot || 'bg-ink-faint'}`} aria-hidden="true" />
      <select
        value={app.status}
        onChange={(e) => onChange(app, e.target.value)}
        disabled={saving}
        aria-label={`Status for ${app.company}, ${app.role}`}
        className="h-8 appearance-none rounded-full border border-line bg-paper-raised pl-6 pr-7 text-[13px] font-medium text-ink-soft transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
    </div>
  );
}

function IconButton({ label, onClick, icon, tone = 'neutral' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded p-2 text-ink-muted transition-colors ${tone === 'danger' ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-paper-sunk hover:text-ink'}`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

export function RowActions({ app, onEdit, onDelete }) {
  const name = `${app.company}, ${app.role}`;
  return (
    <div className="flex items-center justify-end gap-0.5">
      {app.jobUrl ? (
        <a
          href={app.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open job posting for ${name} (new tab)`}
          title="Open job posting"
          className="rounded p-2 text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink"
        >
          <Icon name="external" className="h-4 w-4" />
        </a>
      ) : (
        <span className="w-8" aria-hidden="true" />
      )}
      <IconButton label={`Edit ${name}`} icon="edit" onClick={() => onEdit(app)} />
      <IconButton label={`Delete ${name}`} icon="trash" tone="danger" onClick={() => onDelete(app)} />
    </div>
  );
}

function Title({ app }) {
  const closed = app.status === 'Rejected';
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className={`break-words text-[15px] font-medium ${closed ? 'text-ink-muted' : 'text-ink'}`}>{app.company}</p>
        {isStale(app) && <StatusBadge status="Stale" />}
      </div>
      <p className="break-words text-[13px] text-ink-muted">{app.role}</p>
      {app.notes && <p className="mt-1 line-clamp-1 max-w-md text-[13px] italic text-ink-muted/90">{app.notes}</p>}
    </div>
  );
}

// Desktop: one row of the ledger table.
export function ApplicationRow({ app, onEdit, onDelete, onStatusChange, saving }) {
  const closed = app.status === 'Rejected';
  return (
    <tr className={`group border-b border-line align-top transition-colors hover:bg-paper-raised ${closed ? 'opacity-75' : ''}`}>
      <td className="py-4 pl-1 pr-4">
        <Title app={app} />
      </td>
      <td className="py-4 pr-4">
        <StatusSelect app={app} onChange={onStatusChange} saving={saving} />
      </td>
      <td className="whitespace-nowrap py-4 pr-4 pt-[22px] font-mono text-[13px] text-ink-soft tnum">{formatDate(app.appliedOn || app.createdAt)}</td>
      <td className="whitespace-nowrap py-4 pr-4 pt-[22px] font-mono text-[13px] text-ink-muted tnum" title={formatDate(app.updatedAt)}>
        {relativeTime(app.updatedAt)}
      </td>
      <td className="py-3 pr-1">
        <RowActions app={app} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}

// Mobile: the same information as a stacked card. All actions stay visible (no hover-only controls).
export default function ApplicationCard({ app, onEdit, onDelete, onStatusChange, saving }) {
  const closed = app.status === 'Rejected';
  return (
    <li className={`border-b border-line py-4 ${closed ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <Title app={app} />
        <RowActions app={app} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusSelect app={app} onChange={onStatusChange} saving={saving} />
        <span className="font-mono text-[12px] text-ink-muted tnum">
          Applied {formatDate(app.appliedOn || app.createdAt, { month: 'short', day: 'numeric' })} · updated {relativeTime(app.updatedAt)}
        </span>
      </div>
    </li>
  );
}
