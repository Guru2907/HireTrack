import StatusBadge from './StatusBadge';

export default function ApplicationCard({ app, onEdit, onDelete }) {
  const daysSinceUpdate = Math.floor((new Date() - new Date(app.updatedAt)) / (1000 * 60 * 60 * 24));
  const stale = daysSinceUpdate >= 10 && app.status === "Applied";
  const isRejected = app.status === "Rejected";

  return (
    <div className="w-full border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex justify-between items-center">
      <div>
        <h3 className={`font-semibold text-gray-900 ${isRejected ? "line-through text-gray-400" : ""}`}>
          {app?.company}
        </h3>
        <p className={`text-sm text-gray-600 ${isRejected ? "line-through text-gray-400" : ""}`}>
          {app?.role}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {stale && <StatusBadge status="Stale" />}
        <StatusBadge status={app?.status} />
        <button onClick={() => onEdit(app)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Edit
        </button>
        <button onClick={() => onDelete(app._id)} className="text-sm text-red-600 hover:text-red-700 font-medium">
          Delete
        </button>
      </div>
    </div>
  );
}