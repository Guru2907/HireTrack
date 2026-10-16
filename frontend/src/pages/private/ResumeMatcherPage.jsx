import { useState, useEffect } from "react";
import { getResumes } from "../../api/resumes";
import { matchResume as matchResumeApi } from "../../api/match";
import { Link } from "react-router-dom";
import Textarea from "../../components/Textarea";
import Select from "../../components/Select";
import Button, { buttonClasses } from "../../components/Button";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import SkeletonMatcher from "../../components/SkeletonMatcher";

// Words describe the score so it never relies on colour alone.
const scoreBand = (score) => {
  if (score >= 70) return { label: "Strong overlap", bar: "bg-success" };
  if (score >= 40) return { label: "Partial overlap", bar: "bg-status-interview" };
  return { label: "Weak overlap", bar: "bg-danger" };
};

export default function ResumeMatcherPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (resumes.length > 0) {
      const sorted = resumes.slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      setSelectedResumeId(sorted[0]._id);
    }
  }, [resumes]);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 60000);
    return () => clearTimeout(timer);
  }, [result]);

  if (loading) {
    return <SkeletonMatcher />;
  }

  const matchResume = async (e) => {
    e.preventDefault();
    setErr("");
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

  const jdTooShort = jobDesc.trim().length > 0 && jobDesc.trim().length < 40;
  const noResumes = resumes.length === 0;
  const band = result ? scoreBand(result.score) : null;

  return (
    <>
      <PageHeader
        eyebrow="Resume matcher"
        title="How well does it fit?"
        description="Compare a saved resume against a job description to see which requirements it doesn't mention yet."
      />

      {err && (
        <div role="alert" className="mb-6 flex max-w-2xl items-start gap-2 rounded-[5px] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          {err}
        </div>
      )}

      {noResumes ? (
        <EmptyState title="Save a resume first." description="The matcher compares one of your saved resumes with a job description.">
          <Link to="/resumes" className={buttonClasses("primary")}>
            Add a resume
          </Link>
        </EmptyState>
      ) : (
        <div className={`grid items-start gap-10 ${result ? "lg:grid-cols-2" : "max-w-2xl"}`}>
          <form onSubmit={matchResume}>
            <Select
              label="Resume"
              name="resume"
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              options={resumes.map((resume) => ({ value: resume._id, label: resume.label }))}
            />
            <Textarea
              name="text"
              label="Job description"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the job description here"
              rows={10}
              className="mb-1"
            />
            <p className={`mb-5 font-mono text-[12px] ${jdTooShort ? "text-status-interview" : "text-ink-muted"}`} aria-live="polite">
              {jdTooShort
                ? "This looks short for a real job description. Results may be inaccurate."
                : `${jobDesc.trim().length.toLocaleString("en-US")} characters`}
            </p>
            <Button type="submit" loading={isSubmitting} size="lg">
              {isSubmitting ? "Analyzing…" : "Run match"}
            </Button>
          </form>

          {result && (
            <section aria-labelledby="match-result-heading" className="rounded-md border border-line bg-paper-raised p-6">
              <p id="match-result-heading" className="eyebrow">
                Match estimate
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-[72px] leading-none text-ink tnum">{result.score}</span>
                <span className="font-mono text-sm text-ink-muted">/ 100 · {band.label}</span>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
                <div className={`h-full rounded-full ${band.bar}`} style={{ width: `${result.score}%` }} />
              </div>
              <p className="mt-3 text-[13px] text-ink-muted">
                An AI estimate of how much this resume's content overlaps the job description. It is not a prediction of ATS screening or hiring outcomes.
              </p>

              <h3 className="eyebrow mb-2 mt-8">Missing keywords</h3>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.length === 0 ? (
                  <p className="text-sm text-ink-muted">None. Good coverage.</p>
                ) : (
                  result.missingKeywords.map((keyword, index) => (
                    <span key={`${keyword}-${index}`} className="rounded-full border border-line-strong bg-paper px-2.5 py-1 text-[12px] font-medium text-ink-soft">
                      {keyword}
                    </span>
                  ))
                )}
              </div>

              <h3 className="eyebrow mb-3 mt-8">Suggestions</h3>
              <ol className="space-y-3">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                    <span className="font-mono text-[12px] text-accent">{String(index + 1).padStart(2, "0")}</span>
                    {suggestion}
                  </li>
                ))}
              </ol>

              <Button onClick={handleReset} type="button" variant="secondary" className="mt-8">
                Reset
              </Button>
            </section>
          )}
        </div>
      )}
    </>
  );
}
