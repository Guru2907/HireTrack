import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllApplications } from '../../api/applications';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import ErrorState from '../../components/ErrorState';
import SkeletonDashboard from '../../components/SkeletonDashboard';
import Icon from '../../components/Icon';
import { buttonClasses } from '../../components/Button';
import { STATUSES, STATUS_META, STALE_DAYS, countByStatus, isStale } from '../../lib/status';
import { daysSince, formatDate, relativeTime, startOfWeek } from '../../lib/dates';

const WEEKS = 8;
const WEEK = 7 * 24 * 60 * 60 * 1000;
const appliedDate = (app) => app.appliedOn || app.createdAt;
const pct = (part, whole) => (whole === 0 ? 0 : Math.round((part / whole) * 100));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Everything on this page is derived from the user's real applications.
function useDashboardData(applications) {
  return useMemo(() => {
    const total = applications.length;
    const counts = countByStatus(applications);
    const inPlay = counts.Applied + counts.Interview;
    const heardBack = total - counts.Applied;

    const followUps = applications
      .filter(isStale)
      .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

    const interviewing = applications
      .filter((a) => a.status === 'Interview')
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const recent = applications
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 6);

    const thisWeek = startOfWeek(new Date());
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const start = new Date(thisWeek.getTime() - (WEEKS - 1 - i) * WEEK);
      const end = new Date(start.getTime() + WEEK);
      const count = applications.filter((a) => {
        const d = new Date(appliedDate(a));
        return d >= start && d < end;
      }).length;
      return { start, count, current: i === WEEKS - 1 };
    });

    return { total, counts, inPlay, heardBack, followUps, interviewing, recent, weeks };
  }, [applications]);
}

function Section({ title, meta, children, className = '' }) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="font-display text-[26px] leading-none text-ink">{title}</h2>
        {meta && <span className="eyebrow shrink-0">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function KpiStrip({ data }) {
  const items = [
    { label: 'Logged', value: data.total, note: 'applications, all time' },
    { label: 'In play', value: data.inPlay, note: 'applied or interviewing' },
    { label: 'Interviewing', value: data.counts.Interview, note: 'right now' },
    { label: 'Offers', value: data.counts.Offer, note: plural(data.counts.Offer, 'offer') + ' received' },
    { label: 'Heard back', value: `${pct(data.heardBack, data.total)}%`, note: `${data.heardBack} of ${data.total} replied` },
  ];
  return (
    // 1px gaps over a hairline-coloured background draw the dividing rules at every breakpoint.
    <dl className="mb-12 grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item, i) => (
        <div key={item.label} className={`bg-paper px-4 py-5 sm:px-5 ${i === items.length - 1 ? 'max-lg:col-span-2' : ''}`}>
          <dt className="eyebrow">{item.label}</dt>
          <dd className="mt-2 font-display text-[52px] leading-none text-ink tnum">{item.value}</dd>
          <dd className="mt-2 text-[13px] text-ink-muted">{item.note}</dd>
        </div>
      ))}
    </dl>
  );
}

function PipelineBar({ counts, total }) {
  const segments = STATUSES.filter((s) => counts[s] > 0);
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[3px]" role="img" aria-label={STATUSES.map((s) => `${s}: ${counts[s]}`).join(', ')}>
        {segments.map((s) => (
          <div
            key={s}
            className={`group relative h-full first:rounded-l-[3px] last:rounded-r-[3px] ${STATUS_META[s].bar}`}
            style={{ width: `${(counts[s] / total) * 100}%` }}
          >
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 font-mono text-[11px] text-paper group-hover:block">
              {s} · {counts[s]} ({pct(counts[s], total)}%)
            </span>
          </div>
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-baseline gap-2">
            <span className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ${STATUS_META[s].dot}`} aria-hidden="true" />
            <span className="text-sm text-ink-soft">{STATUS_META[s].label}</span>
            <span className="ml-auto font-mono text-sm text-ink tnum">{counts[s]}</span>
            <span className="w-10 text-right font-mono text-[12px] text-ink-muted tnum">{pct(counts[s], total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WeeklyPace({ weeks }) {
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const totalInRange = weeks.reduce((sum, w) => sum + w.count, 0);
  const thisWeek = weeks[weeks.length - 1].count;
  const lastWeek = weeks[weeks.length - 2].count;

  return (
    <div>
      <div className="flex h-36 items-end gap-[2px]" role="img" aria-label={weeks.map((w) => `Week of ${formatDate(w.start, { month: 'short', day: 'numeric' })}: ${w.count}`).join(', ')}>
        {weeks.map((w) => (
          <div key={w.start.toISOString()} className="group relative flex h-full flex-1 flex-col justify-end">
            {w.current && w.count > 0 && (
              <span className="mb-1 text-center font-mono text-[12px] text-ink tnum">{w.count}</span>
            )}
            <div
              className={`w-full rounded-t-[4px] ${w.current ? 'bg-accent' : 'bg-ink-soft/80 group-hover:bg-ink'}`}
              style={{ height: w.count === 0 ? '2px' : `${(w.count / max) * 100}%`, opacity: w.count === 0 ? 0.35 : 1 }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 font-mono text-[11px] text-paper group-hover:block">
              {plural(w.count, 'application')}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] border-t border-line pt-2">
        {weeks.map((w) => (
          <span key={w.start.toISOString()} className={`flex-1 text-center font-mono text-[10px] ${w.current ? 'text-ink' : 'text-ink-muted'}`}>
            {w.current ? 'This wk' : formatDate(w.start, { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        <span className="text-ink">{plural(thisWeek, 'application')}</span> this week, {lastWeek} last week ·{' '}
        {(totalInRange / WEEKS).toFixed(1)} a week on average over {WEEKS} weeks.
      </p>
    </div>
  );
}

function AppLine({ app, detail, action }) {
  return (
    <li className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{app.company}</p>
        <p className="truncate text-[13px] text-ink-muted">
          {app.role}
          {detail && <> · {detail}</>}
        </p>
      </div>
      {action}
    </li>
  );
}

function FirstRun({ name }) {
  const steps = [
    { n: '01', title: 'Log your first application', text: 'Company, role, link and where it stands. Takes ten seconds.', to: '/applications?new=1', cta: 'Log an application' },
    { n: '02', title: 'Save a resume', text: 'Paste it or upload a PDF. Keep one version per kind of role.', to: '/resumes', cta: 'Add a resume' },
    { n: '03', title: 'Check the fit', text: 'Compare a saved resume against a job description before you apply.', to: '/matcher', cta: 'Open the matcher' },
  ];
  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
        title={name ? `Welcome, ${name.split(' ')[0]}. Start your ledger.` : 'Start your ledger.'}
        description="Nothing is tracked yet. Once you log applications, this page shows what needs a follow-up, how your pipeline is moving, and your weekly pace."
      />
      <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.n} className="flex flex-col bg-paper-raised p-6">
            <span className="font-mono text-[12px] text-accent">{step.n}</span>
            <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">{step.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{step.text}</p>
            <Link to={step.to} className={buttonClasses(step.n === '01' ? 'primary' : 'secondary', 'sm', 'mt-6 self-start')}>
              {step.cta}
              <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function DashboardPage() {
  const { name } = useAuth();
  const [applications, setApplications] = useState([]);
  const [state, setState] = useState('loading'); // loading | error | ready

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

  const data = useDashboardData(applications);

  if (state === 'loading') return <SkeletonDashboard />;
  if (state === 'error') {
    return (
      <>
        <PageHeader eyebrow="Dashboard" title="Your search, at a glance." />
        <ErrorState title="We couldn't load your applications" onRetry={load} />
      </>
    );
  }
  if (data.total === 0) return <FirstRun name={name} />;

  const summary =
    `You've logged ${plural(data.total, 'application')}. ${data.inPlay} ${data.inPlay === 1 ? 'is' : 'are'} still in play` +
    (data.followUps.length > 0
      ? `, and ${data.followUps.length} ${data.followUps.length === 1 ? "hasn't" : "haven't"} moved in ${STALE_DAYS}+ days.`
      : ', and nothing is waiting on a follow-up.');

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
        title="Your search, at a glance."
        description={summary}
        actions={
          <>
            <Link to="/applications?new=1" className={buttonClasses('primary')}>
              <Icon name="plus" />
              Log an application
            </Link>
            <Link to="/matcher" className={buttonClasses('secondary')}>
              Run a match
            </Link>
          </>
        }
      />

      <KpiStrip data={data} />

      <Section title="Pipeline" meta={plural(data.total, 'application')} className="mb-12">
        <PipelineBar counts={data.counts} total={data.total} />
      </Section>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-12 lg:col-span-7">
          <Section title="Needs a follow-up" meta={`Applied, quiet ${STALE_DAYS}+ days`}>
            {data.followUps.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Icon name="check" className="h-4 w-4 text-success" />
                Every open application has moved in the last {STALE_DAYS} days.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.followUps.slice(0, 6).map((app) => (
                  <AppLine
                    key={app._id}
                    app={app}
                    detail={`quiet for ${daysSince(app.updatedAt)} days`}
                    action={
                      <Link to={`/applications?edit=${app._id}`} className={buttonClasses('secondary', 'sm')}>
                        Update
                      </Link>
                    }
                  />
                ))}
              </ul>
            )}
            {data.followUps.length > 6 && (
              <Link to="/applications?status=Applied" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
                See all {data.followUps.length} <Icon name="arrowRight" className="h-3.5 w-3.5" />
              </Link>
            )}
          </Section>

          <Section title="In conversation" meta={plural(data.interviewing.length, 'interview')}>
            {data.interviewing.length === 0 ? (
              <p className="text-sm text-ink-muted">No interviews in progress. When an application moves to Interview it shows up here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.interviewing.slice(0, 5).map((app) => (
                  <AppLine
                    key={app._id}
                    app={app}
                    detail={`updated ${relativeTime(app.updatedAt)}`}
                    action={<StatusBadge status="Interview" />}
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-12 lg:col-span-5">
          <Section title="Weekly pace" meta={`Last ${WEEKS} weeks`}>
            <WeeklyPace weeks={data.weeks} />
          </Section>

          <Section title="Recent activity" meta="Latest updates">
            <ol className="relative space-y-4 border-l border-line pl-5">
              {data.recent.map((app) => (
                <li key={app._id} className="relative">
                  <span
                    className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-paper ${STATUS_META[app.status]?.dot || 'bg-ink-faint'}`}
                    aria-hidden="true"
                  />
                  <p className="text-sm text-ink">
                    <span className="font-medium">{app.company}</span>
                    <span className="text-ink-muted"> · {app.role}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[12px] text-ink-muted">
                    {STATUS_META[app.status]?.label || app.status} · {relativeTime(app.updatedAt)}
                  </p>
                </li>
              ))}
            </ol>
            <Link to="/applications" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
              All applications <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Link>
          </Section>
        </div>
      </div>
    </>
  );
}
