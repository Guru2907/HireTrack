import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
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
import PageHeader from "../../components/PageHeader";
import Dialog from "../../components/Dialog";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import Icon from "../../components/Icon";
import SkeletonResumesPage from "../../components/SkeletonResumesPage";
import { relativeTime } from "../../lib/dates";

const EDIT_FORM_ID = "edit-resume-form";

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editing uses its own fields so the "add" form underneath is never overwritten.
  const [editing, setEditing] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editText, setEditText] = useState("");
  const [editErr, setEditErr] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [confirming, setConfirming] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    getResumes()
      .then((res) => setResumes(res.data))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <SkeletonResumesPage />;

  const handleEditClick = (resume) => {
    setEditing(resume);
    setEditLabel(resume.label);
    setEditText(resume.text);
    setEditErr("");
  };

  const closeEdit = () => {
    setEditing(null);
    setEditErr("");
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setIsSaving(true);
    try {
      const res = await addResume({ label, text });
      setResumes(res.data);
      toast.success(`"${label.trim()}" was saved`);
      setLabel("");
      setText("");
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditErr("");
    setIsUpdating(true);
    try {
      const res = await updateResume(editing._id, { label: editLabel, text: editText });
      setResumes(res.data);
      toast.success(`"${editLabel.trim()}" was updated`);
      closeEdit();
    } catch (err) {
      setEditErr(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteResume(confirming._id);
      setResumes(resumes.filter((resume) => resume._id !== confirming._id));
      toast.success(`Deleted "${confirming.label}"`);
      setConfirming(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed. The resume was kept.");
    } finally {
      setIsDeleting(false);
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
      toast.success(`"${label.trim()}" was uploaded`);
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
    <>
      <PageHeader
        eyebrow="Resumes"
        title="Your resume versions."
        description="Keep one version for every kind of role. Pick one when you run a match."
      />

      {loadFailed ? (
        <ErrorState title="We couldn't load your resumes" onRetry={load} />
      ) : (
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <section className="lg:col-span-7" aria-labelledby="add-resume-heading">
            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-2">
              <h2 id="add-resume-heading" className="font-display text-[26px] leading-none text-ink">
                Add a version
              </h2>
              <span className="eyebrow">Paste or upload</span>
            </div>

            {err && (
              <div role="alert" className="mb-5 flex items-start gap-2 rounded-[5px] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                {err}
              </div>
            )}

            <Input
              type="text"
              name="label"
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. SDE resume v1"
              hint="Used for both options below."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <form onSubmit={handleAddSubmit} className="flex flex-col rounded-md border border-line bg-paper-raised p-4">
                <Textarea
                  name="text"
                  label="Paste the text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your resume text here"
                  rows={7}
                />
                <Button type="submit" variant="secondary" loading={isSaving} className="mt-auto">
                  Save pasted text
                </Button>
              </form>

              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-paper p-6 text-center">
                <Icon name="resumes" className="mb-3 h-7 w-7 text-ink-muted" />
                <p className="text-sm font-medium text-ink">Or upload a PDF</p>
                <p className="mb-4 mt-1 text-[13px] text-ink-muted">We extract the text for you. Up to 5 MB, text-based PDFs only.</p>
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileSelected} className="hidden" />
                <Button type="button" loading={isUploading} onClick={handleUploadButtonClick}>
                  {isUploading ? "Uploading…" : "Choose a PDF"}
                </Button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-5" aria-labelledby="saved-resumes-heading">
            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-2">
              <h2 id="saved-resumes-heading" className="font-display text-[26px] leading-none text-ink">
                Saved
              </h2>
              <span className="eyebrow">{resumes.length} {resumes.length === 1 ? "version" : "versions"}</span>
            </div>

            {resumes.length === 0 ? (
              <EmptyState title="No resumes yet." description="Add your first version on the left. The matcher needs at least one." />
            ) : (
              <ul className="divide-y divide-line border-b border-line">
                {resumes.map((resume) => (
                  <li key={resume._id} className="flex items-center gap-3 py-3.5">
                    <Icon name="resumes" className="h-5 w-5 shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink">{resume.label}</p>
                      <p className="font-mono text-[12px] text-ink-muted">
                        Added {relativeTime(resume.uploadedAt)} · {(resume.text || "").length.toLocaleString("en-US")} characters
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleEditClick(resume)}
                        aria-label={`Edit ${resume.label}`}
                        title="Edit"
                        className="rounded p-2 text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(resume)}
                        aria-label={`Delete ${resume.label}`}
                        title="Delete"
                        className="rounded p-2 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={isUpdating ? undefined : closeEdit}
        placement="sheet"
        title="Edit resume"
        description={editing?.label}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeEdit} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" form={EDIT_FORM_ID} loading={isUpdating}>
              Update resume
            </Button>
          </div>
        }
      >
        <form id={EDIT_FORM_ID} onSubmit={handleEditSubmit} className="flex h-full flex-col px-6 py-6">
          {editErr && (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-[5px] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {editErr}
            </div>
          )}
          <Input type="text" name="label" label="Label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="e.g. SDE resume v1" data-autofocus />
          <Textarea name="text" label="Resume text" value={editText} onChange={(e) => setEditText(e.target.value)} rows={18} className="mb-0" />
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Delete this resume?"
        description={confirming ? `"${confirming.label}" will be removed. This can't be undone.` : ""}
        confirmLabel="Delete resume"
        busy={isDeleting}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
