const COLORS = {
  Applied:   'bg-purple-200 text-purple-800',
  Interview: 'bg-yellow-200 text-yellow-800',
  Offer:     'bg-green-200 text-green-800',
  Rejected:  'bg-red-200 text-red-800',
  Stale:     'bg-[#D2B48C] text-[#4A2E13] animate-pulse',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${COLORS[status] || ''}`}>
      {status}
    </span>
  );
}