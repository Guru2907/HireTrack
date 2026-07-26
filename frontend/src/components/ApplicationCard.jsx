import StatusBadge from './StatusBadge';

// TODO — Phase 2 + stale-application extra:
// compute "days since update" from app.updatedAt and show a badge if >= 10 days with no change
export default function ApplicationCard({ app }) {
  return (
    <div className="border rounded p-4 mb-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{app?.company}</h3>
          <p className="text-sm text-gray-600">{app?.role}</p>
        </div>
        <StatusBadge status={app?.status} />
      </div>
      {/* TODO: stale badge, resumeVersion tag, edit/delete actions */}
    </div>
  );
}
