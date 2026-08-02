import { useEffect, useState } from "react";
import { getResumes, addResume, deleteResume } from "../../api/resumes";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Textarea from "../../components/Textarea";

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    getResumes()
      .then((res) => {
        setResumes(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErr(err.response?.data?.message || "Something went wrong");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const createResumes = async (e) => {
    e.preventDefault();
    try {
      const data = { label, text };
      const res = await addResume(data);
      setResumes(res.data);
      setLabel("");
      setText("");
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

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">
        Resumes
      </h1>
      <p className="text-gray-500 mb-8">
        Keep a version for every kind of role — pick one when you run a match.
      </p>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
          {err}
        </div>
      )}

      <form onSubmit={createResumes} className="mb-10">
        <Input
          type="text"
          name="label"
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. SDE Resume v1"
        />
        <Textarea
          name="text"
          label="Resume Text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your resume text here"
        />
        <Button type="submit">Save Resume</Button>
      </form>

      <div className="border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
        {resumes.map((resume) => {
          const daysAgo = Math.floor(
            (new Date() - new Date(resume.uploadedAt)) / (1000 * 60 * 60 * 24)
          );
          const addedLabel = daysAgo === 0 ? "Added today" : `Added ${daysAgo}d ago`;

          return (
            <div
              key={resume._id}
              className="group flex items-center justify-between py-4"
            >
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
              <button
                onClick={() => deleteResumes(resume._id)}
                className="text-sm text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}