import { useState, useEffect } from "react";
import { getResumes } from "../../api/resumes";
import { matchResume as matchResumeApi } from "../../api/match";
import Textarea from "../../components/Textarea";
import Button from "../../components/Button";
import SkeletonMatcher from "../../components/SkeletonMatcher";

export default function ResumeMatcherPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  
useEffect(() => {
  const minDelay = new Promise((resolve) => setTimeout(resolve, 1000));
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
    if (resumes.length > 0) {
      const sorted = resumes.slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      setSelectedResumeId(sorted[0]._id);
    }
  }, [resumes]);

  useEffect(() => {
    if (!result) return;

    const timer = setTimeout(() => {
      setResult(null);
    }, 60000);

    return () => clearTimeout(timer);
  }, [result]);

  if (loading) {
  return <SkeletonMatcher />;
  }

  const matchResume = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedResume = resumes.find((r) => r._id === selectedResumeId);
      const res = await matchResumeApi({
        resumeText: selectedResume.text,
        jobDescription: jobDesc,
      });
      setResult(res.data);
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setJobDesc("");
  };

  return (
    <div className={`mx-auto px-6 py-10 transition-all duration-500 ${
      result ? "max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start" : "max-w-2xl"
    }`}>
      <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">Resume Matcher</h1>
        <p className="text-gray-500 mb-8">See how well a saved resume matches a job description.</p>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
            {err}
          </div>
        )}

        <form onSubmit={matchResume} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Resume</label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {resumes.map((resume) => (
                <option key={resume._id} value={resume._id}>{resume.label}</option>
              ))}
            </select>
          </div>

          <Textarea
            name="text"
            label="Job Description"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Paste your job description here"
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              "Run Match"
            )}
          </Button>
        </form>
      </div>

      {result && (
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-bold text-gray-900">{result.score}</span>
            <span className="text-gray-400 text-lg">/ 100 match</span>
          </div>

          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Missing Keywords
          </h3>
          <div className="flex flex-wrap gap-2 mb-8">
            {result.missingKeywords.map((keyword) => (
              <span key={keyword} className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                {keyword}
              </span>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Suggestions
          </h3>
          <ul className="space-y-2 mb-6">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="text-gray-700 text-sm pl-4 border-l-2 border-blue-200">
                {suggestion}
              </li>
            ))}
          </ul>

          <Button onClick={handleReset} type="button" variant="closing">
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}