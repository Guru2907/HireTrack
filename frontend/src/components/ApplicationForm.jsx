import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createApplication, updateApplication } from '../api/applications';
import { STATUSES } from '../lib/status';
import { fromDateInput, toDateInput } from '../lib/dates';
import Dialog from './Dialog';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import Icon from './Icon';

const FORM_ID = 'application-form';
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));

const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

// Mirrors the server's rules (backend/validation/applications.js) so most mistakes are caught before a request.
// The server stays the source of truth: its field errors are shown too.
const validate = ({ company, role, jobUrl, notes }) => {
  const errors = {};
  if (!company.trim()) errors.company = 'Company is required';
  else if (company.trim().length > 200) errors.company = 'Company must be at most 200 characters';
  if (!role.trim()) errors.role = 'Role is required';
  else if (role.trim().length > 200) errors.role = 'Role must be at most 200 characters';
  if (jobUrl.trim() && !isHttpUrl(jobUrl.trim())) errors.jobUrl = 'Enter a full link starting with http:// or https://';
  if (notes.length > 5000) errors.notes = 'Notes must be at most 5000 characters';
  return errors;
};

const emptyForm = () => ({ company: '', role: '', status: 'Applied', jobUrl: '', notes: '', appliedOn: toDateInput() });

const formFrom = (app) => ({
  company: app.company || '',
  role: app.role || '',
  status: app.status || 'Applied',
  jobUrl: app.jobUrl || '',
  notes: app.notes || '',
  appliedOn: toDateInput(app.appliedOn || app.createdAt),
});

// Add / edit an application in a slide-over sheet. `application` null = create.
export default function ApplicationForm({ open, application, onClose, onSaved }) {
  const isEdit = Boolean(application);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(application ? formFrom(application) : emptyForm());
    setErrors({});
    setFormError('');
    setSaving(false);
  }, [open, application]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Only allow-listed fields are sent (see backend/validation/applications.js).
    const payload = {
      company: form.company,
      role: form.role,
      status: form.status,
      jobUrl: form.jobUrl,
      notes: form.notes,
      appliedOn: fromDateInput(form.appliedOn),
    };

    setSaving(true);
    try {
      const res = isEdit ? await updateApplication(application._id, payload) : await createApplication(payload);
      toast.success(isEdit ? `Saved changes to ${res.data.company}` : `Logged ${res.data.company}`);
      onSaved(res.data, isEdit);
    } catch (err) {
      const data = err.response?.data;
      if (Array.isArray(data?.errors)) {
        setErrors(Object.fromEntries(data.errors.map((fe) => [fe.field, fe.message])));
      }
      setFormError(data?.message || 'Something went wrong. Your changes were not saved.');
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      placement="sheet"
      title={isEdit ? 'Edit application' : 'Log an application'}
      description={isEdit ? `${application.company} · ${application.role}` : 'Fields marked * are required.'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            {isEdit ? 'Save changes' : 'Log application'}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="px-6 py-6">
        {formError && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-[5px] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Input label="Company" name="company" required value={form.company} onChange={set('company')} error={errors.company} placeholder="e.g. Stripe" autoComplete="organization" data-autofocus />
          <Input label="Role" name="role" required value={form.role} onChange={set('role')} error={errors.role} placeholder="e.g. Software Engineer Intern" />
          <Select label="Status" name="status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} error={errors.status} />
          <Input label="Applied on" name="appliedOn" type="date" value={form.appliedOn} onChange={set('appliedOn')} error={errors.appliedOn} />
        </div>

        <Input
          label="Job posting link"
          name="jobUrl"
          type="url"
          value={form.jobUrl}
          onChange={set('jobUrl')}
          error={errors.jobUrl}
          placeholder="https://"
          hint="Optional. Opens in a new tab from the list."
        />
        <Textarea
          label="Notes"
          name="notes"
          rows={5}
          value={form.notes}
          onChange={set('notes')}
          error={errors.notes}
          placeholder="Recruiter name, referral, salary range, next steps…"
          hint={`${form.notes.length.toLocaleString('en-US')} / 5,000`}
          className="mb-0"
        />
      </form>
    </Dialog>
  );
}
