import { useState, useEffect } from "react";
import {
  getAllApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from "../../api/applications";
import ApplicationCard from "../../components/ApplicationCard";
import Button from "../../components/Button";
import Input from "../../components/Input";
import SkeletonApplicationCard from "../../components/SkeletonApplicationCard";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [err, setErr] = useState("");

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Choose your status");

  
useEffect(() => {
  const minDelay = new Promise((resolve) => setTimeout(resolve, 1000));
  Promise.all([getAllApplications(), minDelay])
    .then(([res]) => {
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
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">
      {[1, 2, 3].map((i) => <SkeletonApplicationCard key={i} />)}
    </div>
  );
}

  const resetForm = () => {
    setCompany("");
    setRole("");
    setJobUrl("");
    setNotes("");
    setStatus("Choose your status");
  };

  const closeForms = () => {
    resetForm();
    setIsAdding(false);
    setEditingApplication(null);
  };

  const createNewApplication = async (e) => {
    e.preventDefault();
    try {
      if (editingApplication == null) {
        const res = await createApplication({ company, role, jobUrl, notes, status });
        setApplications([...applications, res.data]);
      } else {
        const res = await updateApplication(editingApplication._id, { company, role, jobUrl, notes, status });
        setApplications(applications.map((app) => (app._id === editingApplication._id ? res.data : app)));
      }
      closeForms();
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong");
    }
  };

  const openEditForm = (app) => {
    setIsAdding(false);
    setEditingApplication(editingApplication?._id === app._id ? null : app);
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

  const renderForm = () => (
    <form
      onSubmit={createNewApplication}
      className="border border-gray-200 rounded-xl p-5 bg-gray-50 mb-4"
    >
      <Input type="text" name="company" label="Company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Enter the company name" />
      <Input type="text" name="role" label="Role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Enter your role offered" />
      <Input type="url" name="jobUrl" label="Job URL" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="Enter the URL" />
      <Input type="text" name="notes" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter your notes here" />
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
      <div className="flex items-center gap-4">
        <Button type="submit">Save</Button>
        <Button type="button" variant="closing" onClick={() => closeForms()} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Button>
      </div>
    </form>
  );

  const sortedApplications = applications.slice().sort((a, b) => {
    const aRejected = a.status === "Rejected" ? 1 : 0;
    const bRejected = b.status === "Rejected" ? 1 : 0;
    if (aRejected !== bRejected) return aRejected - bRejected;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-gray-900">Applications</h1>
        <Button
          variant={isAdding? "closing":"primary"}
          onClick={() => {
            if (isAdding) {
              closeForms();
            } else {
              setEditingApplication(null);
              setIsAdding(true);
            }
          }}
        >
          {isAdding ? "Cancel" : "Add Application"}
        </Button>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
          {err}
        </div>
      )}

      {isAdding && renderForm()}

      {applications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No applications yet — click "Add Application" to log your first one.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedApplications.map((app) => (
            <div key={app._id}>
              <ApplicationCard app={app} onEdit={openEditForm} onDelete={deleteEntry} />
              {editingApplication?._id === app._id && (
                <div className="mt-3">{renderForm()}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}