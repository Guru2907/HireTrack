import { daysSince } from './dates';

// Must match the backend enum (backend/models/Application.js). Order is the pipeline order.
export const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];

// The single source of truth for status presentation (badges, filters, dashboard bars).
// Colours are a validated categorical set; status is always shown with a text label too, never colour alone.
export const STATUS_META = {
  Applied: { label: 'Applied', hint: 'Waiting to hear back', dot: 'bg-status-applied', bar: 'bg-status-applied' },
  Interview: { label: 'Interview', hint: 'In conversation', dot: 'bg-status-interview', bar: 'bg-status-interview' },
  Offer: { label: 'Offer', hint: 'Offer received', dot: 'bg-status-offer', bar: 'bg-status-offer' },
  Rejected: { label: 'Rejected', hint: 'Closed', dot: 'bg-status-rejected', bar: 'bg-status-rejected' },
};

// An application still marked "Applied" with no update for this many days needs a follow-up.
export const STALE_DAYS = 10;

export const isStale = (app) => app.status === 'Applied' && daysSince(app.updatedAt) >= STALE_DAYS;

export const countByStatus = (applications) =>
  STATUSES.reduce((acc, s) => ({ ...acc, [s]: applications.filter((a) => a.status === s).length }), {});
