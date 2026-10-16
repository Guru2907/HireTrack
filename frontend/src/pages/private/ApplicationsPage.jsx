import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAllApplications, updateApplication, deleteApplication } from '../../api/applications';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Select from '../../components/Select';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ConfirmDialog from '../../components/ConfirmDialog';
import ApplicationForm from '../../components/ApplicationForm';
import ApplicationCard, { ApplicationRow } from '../../components/ApplicationCard';
import SkeletonApplicationCard from '../../components/SkeletonApplicationCard';
import { STATUSES, STATUS_META, countByStatus } from '../../lib/status';

const SORTS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'applied', label: 'Applied date (newest)' },
  { value: 'company', label: 'Company (A–Z)' },
];

const COMPARE = {
  updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  applied: (a, b) => new Date(b.appliedOn || b.createdAt) - new Date(a.appliedOn || a.createdAt),
  company: (a, b) => a.company.localeCompare(b.company, undefined, { sensitivity: 'base' }),
};

export default function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [state, setState] = useState('loading'); // loading | error | ready

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = searchParams.get('status');
    return STATUSES.includes(s) ? s : 'All';
  });
  const [sort, setSort] = useState('updated');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [savingIds, setSavingIds] = useState(() => new Set());

  const load = useCallback(() => {
    setState('loading');
    getAllApplications()
      .then((res) => {
        setApplications(Array.isArray(res.data) ? res.data : []);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  useEffect(load, [load]);

  // Deep links from the dashboard: ?new=1 opens the form, ?edit=<id> opens that application.
  useEffect(() => {
    if (state !== 'ready') return;
    const wantsNew = searchParams.get('new') === '1';
    const editId = searchParams.get('edit');
    if (!wantsNew && !editId) return;

    if (wantsNew) {
      setEditing(null);
      setFormOpen(true);
    } else {
      const target = applications.find((a) => a._id === editId);
      if (target) {
        setEditing(target);
        setFormOpen(true);
      } else {
        toast.error('That application could not be found.');
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    next.delete('edit');
    setSearchParams(next, { replace: true });
  }, [state, searchParams, setSearchParams, applications]);

  const counts = useMemo(() => countByStatus(applications), [applications]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications
      .filter((a) => statusFilter === 'All' || a.status === statusFilter)
      .filter((a) => !q || [a.company, a.role, a.notes].some((v) => v && v.toLowerCase().includes(q)))
      .sort((a, b) => {
        // Closed (rejected) applications always sink to the bottom.
        const closed = (a.status === 'Rejected') - (b.status === 'Rejected');
        return closed || COMPARE[sort](a, b);
      });
  }, [applications, statusFilter, query, sort]);

  const chooseFilter = (value) => {
    setStatusFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'All') next.delete('status');
    else next.set('status', value);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setQuery('');
    chooseFilter('All');
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (app) => {
    setEditing(app);
    setFormOpen(true);
  };

  const handleSaved = (saved, wasEdit) => {
    setApplications((list) => (wasEdit ? list.map((a) => (a._id === saved._id ? saved : a)) : [saved, ...list]));
    setFormOpen(false);
    setEditing(null);
  };

  // Optimistic inline status change; reverted if the server rejects it.
  const changeStatus = async (app, status) => {
    if (status === app.status) return;
    const previous = app;
    setApplications((list) => list.map((a) => (a._id === app._id ? { ...a, status } : a)));
    setSavingIds((ids) => new Set(ids).add(app._id));
    try {
      const res = await updateApplication(app._id, { status });
      setApplications((list) => list.map((a) => (a._id === app._id ? res.data : a)));
      toast.success(`${app.company} moved to ${status}`);
    } catch (err) {
      setApplications((list) => list.map((a) => (a._id === app._id ? previous : a)));
      toast.error(err.response?.data?.message || `Couldn't update ${app.company}. Nothing was changed.`);
    } finally {
      setSavingIds((ids) => {
        const next = new Set(ids);
        next.delete(app._id);
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!confirming) return;
    setDeleting(true);
    try {
      await deleteApplication(confirming._id);
      setApplications((list) => list.filter((a) => a._id !== confirming._id));
      toast.success(`Deleted ${confirming.company}`);
      setConfirming(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed. The application was kept.');
    } finally {
      setDeleting(false);
    }
  };

  const filtersActive = statusFilter !== 'All' || query.trim() !== '';
  const rowProps = (app) => ({
    app,
    onEdit: openEdit,
    onDelete: setConfirming,
    onStatusChange: changeStatus,
    saving: savingIds.has(app._id),
  });

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Every role, in one ledger."
        description="Where each application stands, when you applied, and which ones have gone quiet. Change a status right from the list."
        actions={
          <Button onClick={openCreate}>
            <Icon name="plus" />
            Log an application
          </Button>
        }
      />

      {state === 'loading' && (
        <div aria-busy="true" aria-label="Loading applications">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonApplicationCard key={i} />
          ))}
        </div>
      )}

      {state === 'error' && <ErrorState title="We couldn't load your applications" onRetry={load} />}

      {state === 'ready' && applications.length === 0 && (
        <EmptyState
          eyebrow="Nothing logged yet"
          title="Your ledger is empty."
          description="Log the first role you've applied for. You can track its status, keep notes, and spot applications that need a follow-up."
        >
          <Button onClick={openCreate}>
            <Icon name="plus" />
            Log your first application
          </Button>
        </EmptyState>
      )}

      {state === 'ready' && applications.length > 0 && (
        <>
          <div className="mb-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative flex-1">
                <label htmlFor="application-search" className="sr-only">
                  Search applications
                </label>
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  id="application-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search company, role or notes"
                  className="h-10 w-full rounded-[5px] border border-line-strong bg-paper-raised pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-faint transition-colors hover:border-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
                />
              </div>
              <Select
                label="Sort by"
                name="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                options={SORTS}
                className="sm:w-56"
              />
            </div>

            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
              {['All', ...STATUSES].map((value) => {
                const active = statusFilter === value;
                const count = value === 'All' ? applications.length : counts[value];
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseFilter(value)}
                    aria-pressed={active}
                    className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                      active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-raised text-ink-soft hover:border-line-strong hover:text-ink'
                    }`}
                  >
                    {value !== 'All' && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[value].dot}`} aria-hidden="true" />}
                    {value}
                    <span className={`font-mono text-[11px] tnum ${active ? 'text-paper/70' : 'text-ink-muted'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="eyebrow mb-2" aria-live="polite">
            {filtersActive ? `Showing ${visible.length} of ${applications.length}` : `${applications.length} applications`}
          </p>

          {visible.length === 0 ? (
            <EmptyState title="Nothing matches." description="No application fits this search and status filter.">
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </EmptyState>
          ) : (
            <>
              <table className="hidden w-full border-t border-ink md:table">
                <caption className="sr-only">Your job applications</caption>
                <thead>
                  <tr className="border-b border-line text-left">
                    <th scope="col" className="eyebrow py-3 pl-1 pr-4 font-medium">Company &amp; role</th>
                    <th scope="col" className="eyebrow py-3 pr-4 font-medium">Status</th>
                    <th scope="col" className="eyebrow py-3 pr-4 font-medium">Applied</th>
                    <th scope="col" className="eyebrow py-3 pr-4 font-medium">Updated</th>
                    <th scope="col" className="py-3 pr-1">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((app) => (
                    <ApplicationRow key={app._id} {...rowProps(app)} />
                  ))}
                </tbody>
              </table>

              <ul className="border-t border-ink md:hidden">
                {visible.map((app) => (
                  <ApplicationCard key={app._id} {...rowProps(app)} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <ApplicationForm
        open={formOpen}
        application={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Delete this application?"
        description={confirming ? `${confirming.company} · ${confirming.role}. This can't be undone.` : ''}
        confirmLabel="Delete application"
        busy={deleting}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
