import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { buttonClasses } from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import Icon from '../../components/Icon';

const FEATURES = [
  { n: '01', title: 'Track every application', description: 'Company, role, link, notes and status, logged in one place instead of a spreadsheet.' },
  { n: '02', title: 'See what needs a follow-up', description: 'Applications that have gone quiet for ten days are flagged, so nothing slips.' },
  { n: '03', title: 'A dashboard built from your data', description: 'Pipeline, weekly pace and recent activity, calculated from what you actually logged.' },
  { n: '04', title: 'Check a resume against a job', description: 'Save resume versions (paste or PDF) and get an AI estimate of keyword overlap with a job description.' },
];

// Clearly labelled illustration for the landing page; not real data.
const EXAMPLE_ROWS = [
  { company: 'Northwind', role: 'Software Engineer Intern', status: 'Interview', when: 'Applied Sep 12' },
  { company: 'Contoso', role: 'Backend Developer Intern', status: 'Applied', when: 'Applied Sep 30' },
  { company: 'Fabrikam', role: 'Full-Stack Intern', status: 'Offer', when: 'Applied Aug 28' },
];

export default function LandingPage() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return (
      <div className="mx-auto max-w-xl px-4 py-28 text-center">
        <p className="eyebrow mb-3">Welcome back</p>
        <h1 className="font-display text-[48px] leading-[1.02] text-ink">Here's where things stand.</h1>
        <p className="mb-8 mt-4 text-ink-muted">Jump back into your dashboard to see your latest application activity.</p>
        <Link to="/dashboard" className={buttonClasses('primary', 'lg')}>
          Go to dashboard
          <Icon name="arrowRight" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 md:grid-cols-12 md:py-28">
        <div className="md:col-span-7">
          <p className="eyebrow mb-5">A ledger for the job hunt</p>
          <h1 className="font-display text-[56px] leading-[0.98] tracking-[-0.015em] text-ink sm:text-[76px]">
            Every application.
            <br />
            <span className="italic text-accent">Nothing forgotten.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-soft">
            Log where you've applied, see which applications have gone quiet, and check how well a resume fits a job before you send it.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/signup" className={buttonClasses('primary', 'lg')}>
              Start tracking, free
            </Link>
            <Link to="/login" className={buttonClasses('secondary', 'lg')}>
              Log in
            </Link>
          </div>
        </div>

        <figure className="md:col-span-5">
          <div className="rounded-md border border-line bg-paper-raised">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="eyebrow">Applications</span>
              <span className="eyebrow">3 entries</span>
            </div>
            <ul className="divide-y divide-line">
              {EXAMPLE_ROWS.map((row) => (
                <li key={row.company} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-ink">{row.company}</p>
                    <p className="truncate text-[13px] text-ink-muted">{row.role}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink-muted">{row.when}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          </div>
          
        </figure>
      </section>

      <section className="border-y border-line bg-paper-raised">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="mb-12 max-w-xl font-display text-[40px] leading-[1.05] text-ink">What's actually in it.</h2>
          <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.n} className="bg-paper-raised p-7">
                <span className="font-mono text-[12px] text-accent">{feature.n}</span>
                <h3 className="mt-3 text-[17px] font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-[44px] leading-[1.05] text-ink">Stop tracking applications in a spreadsheet.</h2>
        <Link to="/signup" className={buttonClasses('primary', 'lg', 'mt-8')}>
          Create a free account
          <Icon name="arrowRight" />
        </Link>
      </section>
    </div>
  );
}
