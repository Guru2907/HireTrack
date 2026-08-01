import StatusBadge from './StatusBadge';

export default function ApplicationCard({ app, onEdit, onDelete }) {
    const timeMili = new Date() - new Date(app.updatedAt)
    const time = timeMili / (1000*60*60*24)
    const stale = time >= 10 && app.status === "Applied";
  return (
    <div className="border rounded-xl p-4 mb-3 bg-white shadow-sm flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-gray-900">{app?.company}</h3>
        <p className="text-sm text-gray-600">{app?.role}</p>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={app?.status} />
        {stale && <StatusBadge status="Stale"/>}
        <button
          onClick={() => onEdit(app)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(app._id)}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}