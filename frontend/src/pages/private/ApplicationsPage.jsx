import { useState, useEffect } from "react";
import {
  getAllApplications,
  createApplication,
  updateApplication,
  deleteApplication
} from "../../api/applications";
import ApplicationCard from "../../components/ApplicationCard";
import Button from "../../components/Button";
import Input from "../../components/Input";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [err, setErr] = useState("");

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Choose your status");

  const [editingApplication, setEditingApplication] = useState(null);

  useEffect(() => {
    getAllApplications()
      .then((res) => {
        setApplications(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (editingApplication) {
      setCompany(editingApplication.company);
      setRole(editingApplication.role);
      setJobUrl(editingApplication.jobUrl);
      setNotes(editingApplication.notes);
      setStatus(editingApplication.status);
    } else {
      setCompany("");
      setRole("");
      setJobUrl("");
      setNotes("");
      setStatus("Choose your status");
    }
  }, [editingApplication]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const createNewApplication = async (e) => {
    e.preventDefault();
    try {
      if (editingApplication == null) {
        const res = await createApplication({
          company,
          role,
          jobUrl,
          notes,
          status,
        });
        setApplications([...applications, res.data]);
      } else {
        const res = await updateApplication(editingApplication._id, {
          company,
          role,
          jobUrl,
          notes,
          status,
        });
        setApplications(
          applications.map((app) =>
            app._id === editingApplication._id ? res.data : app,
          ),
        );
      }
      setIsModalOpen(false);
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong");
    }
  };

  const openEditForm = (app) => {
    setEditingApplication(app);
    setIsModalOpen(true);
  };

  const deleteEntry = async (id) => {
  const confirmed = window.confirm("Delete this application?");
  if (!confirmed) return;

  try {
    await deleteApplication(id);
    setApplications(applications.filter((app) => app._id !== id));
  } catch (err) {
    setErr(err.response?.data?.message || "Something went wrong");
  }
};

return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl font-bold text-gray-900">Applications</h1>
        </div>
        <Button
          onClick={() => {
            setEditingApplication(null);
            setIsModalOpen(true);
          }}
        >
          Add Application
        </Button>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
          {err}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No applications yet — click "Add Application" to log your first one.
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard
              key={app._id}
              app={app}
              onEdit={openEditForm}
              onDelete={deleteEntry}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-lg text-gray-900">
                {editingApplication ? "Edit Application" : "New Application"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>

            <form onSubmit={createNewApplication} className="px-6 py-6">
              <Input
                type="text"
                name="company"
                label="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter the company name"
              />
              <Input
                type="text"
                name="role"
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Enter your role offered"
              />
              <Input
                type="url"
                name="jobUrl"
                label="Job URL"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="Enter the URL"
              />
              <Input
                type="text"
                name="notes"
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter your notes here"
              />
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Choose your status">Choose your status</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-4 mt-8">
                <Button type="submit">Save</Button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}