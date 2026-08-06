import { useEffect, useState, useRef } from "react";
import {
  getResumes,
  addResume,
  deleteResume,
  updateResume,
  uploadResumePdf,
} from "../../api/resumes";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Textarea from "../../components/Textarea";
import SkeletonResumesPage from "../../components/SkeletonResumesPage";

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 500));
    Promise.all([getResumes(), minDelay])
      .then(([res]) => {
        setResumes(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErr(err.response?.data?.message || "Something went wrong");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(""), 4000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  if (loading) {
  return <SkeletonResumesPage />;
}

  const handleEditClick = (resume) => {
    setLabel(resume.label);
    setText(resume.text);
    setEditingId(resume._id);
  };

  const closeEdit = () => {
    setEditingId(null);
    setLabel("");
    setText("");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const data = { label, text };
      if (editingId) {
        const res = await updateResume(editingId, data);
        setResumes(res.data);
        setSuccessMsg(`"${label}" was updated successfully.`);
        closeEdit();
      } else {
        const res = await addResume(data);
        setResumes(res.data);
        setSuccessMsg(`"${label}" was saved successfully.`);
        setLabel("");
        setText("");
      }
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong");
    }
  };

  const deleteResumes = async (id) => {
    const confirmed = window.confirm("Delete this resume?");
    if (!confirmed) return;
    try {
      await deleteResume(id);
      setResumes(resumes.filter((resume) => resume._id !== id));
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong");
    }
  };

  const handleUploadButtonClick = () => {
    setErr("");
    if (!label) {
      setErr("Please enter a label before uploading a PDF.");
      return;
    }
    fileInputRef.current.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErr("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("label", label);
      formData.append("file", file);
      const res = await uploadResumePdf(formData);
      setResumes(res.data);
      setSuccessMsg(`"${label}" was uploaded successfully.`);
      setLabel("");
      setText("");
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong uploading the PDF");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">Resumes</h1>
      <p className="text-gray-500 mb-8">
        Keep a version for every kind of role — pick one when you run a match.
      </p>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
          {err}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-6">
          {successMsg}
        </div>
      )}

      {editingId ? (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-6"
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-lg text-gray-900">Editing Resume</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 px-8 py-6 overflow-y-auto">
              <Input
                type="text" name="label" label="Label" value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. SDE Resume v1"
              />
              <div className="flex-1 flex flex-col mb-4">
                <label className="block text-sm font-medium mb-1">Resume Text</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit">Update Resume</Button>
                <Button type="button" variant="secondary" onClick={closeEdit}>Cancel Edit</Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-6 mb-10 border border-gray-200 bg-white">
          <h2 className="font-semibold text-gray-900 mb-4">Add a Resume</h2>

          <Input
            type="text" name="label" label="Label" value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. SDE Resume v1"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mt-2">
            <form onSubmit={handleFormSubmit} className="flex flex-col border border-gray-200 rounded-lg p-4">
              <Textarea
                name="text"
                label="Paste Resume Text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your resume text here"
              />
              <Button type="submit" className="mt-auto">Save Resume</Button>
            </form>

            <div className="flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelected}
                className="hidden"
              />
              <p className="text-sm text-gray-500 mb-3">Or upload a PDF and we'll extract the text</p>
              <Button type="button" disabled={isUploading} onClick={handleUploadButtonClick}>
                {isUploading ? "Uploading..." : "Choose PDF & Upload"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
        {resumes.map((resume) => {
          const daysAgo = Math.floor((new Date() - new Date(resume.uploadedAt)) / (1000 * 60 * 60 * 24));
          const addedLabel = daysAgo === 0 ? "Added today" : `Added ${daysAgo}d ago`;
          return (
            <div key={resume._id} className="group flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400 shrink-0">
                  <path d="M4 1.5h7l3 3v10.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-12.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M11 1.5v3h3" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
                <div>
                  <p className="text-gray-900 font-medium">{resume.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{addedLabel}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleEditClick(resume)} className="text-sm text-blue-500 opacity-0 group-hover:opacity-100 transition">Edit</button>
                <button onClick={() => deleteResumes(resume._id)} className="text-sm text-red-500 opacity-0 group-hover:opacity-100 transition">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}