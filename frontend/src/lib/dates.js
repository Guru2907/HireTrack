const DAY = 24 * 60 * 60 * 1000;

export const daysSince = (value) => {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / DAY));
};

export const formatDate = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  value ? new Date(value).toLocaleDateString('en-US', options) : '—';

export const relativeTime = (value) => {
  if (!value) return '—';
  const days = daysSince(value);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  return formatDate(value);
};

// <input type="date"> works with local calendar dates (YYYY-MM-DD).
export const toDateInput = (value) => {
  const d = value ? new Date(value) : new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// Send the chosen calendar day as local noon, so it shows as the same day in every timezone.
export const fromDateInput = (yyyyMmDd) => {
  if (!yyyyMmDd) return undefined;
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
};

// Monday 00:00 (local) of the week containing `value`.
export const startOfWeek = (value) => {
  const d = new Date(value);
  const shift = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - shift);
  return d;
};
