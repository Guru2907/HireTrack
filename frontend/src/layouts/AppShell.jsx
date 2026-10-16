import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dialog from '../components/Dialog';
import Icon from '../components/Icon';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/applications', label: 'Applications', icon: 'applications' },
  { to: '/resumes', label: 'Resumes', icon: 'resumes' },
  { to: '/matcher', label: 'Resume matcher', icon: 'matcher' },
];

const initialsOf = (name) =>
  name ? name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?';

function Wordmark() {
  return (
    <Link to="/dashboard" className="group block rounded-sm">
      <span className="font-display text-[28px] leading-none text-ink">
        Hire<span className="italic text-accent">track</span>
      </span>
      <span className="eyebrow mt-1 block text-[10px]">The job search ledger</span>
    </Link>
  );
}

function NavItems({ onNavigate }) {
  return (
    <ul className="space-y-0.5">
      {NAV.map((item, index) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-[5px] px-3 py-2.5 text-[14px] transition-colors ${
                isActive ? 'bg-paper-sunk font-medium text-ink' : 'text-ink-soft hover:bg-paper-sunk/70 hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`}
                  aria-hidden="true"
                />
                <span className="tnum w-5 font-mono text-[11px] text-ink-faint" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon name={item.icon} className={`h-4 w-4 ${isActive ? 'text-accent' : 'text-ink-muted group-hover:text-ink'}`} />
                {item.label}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function Account({ onNavigate, onLogout }) {
  const { name } = useAuth();
  return (
    <div className="border-t border-line pt-4">
      <div className="mb-3 flex items-center gap-3 px-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[12px] font-medium text-paper">
          {initialsOf(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{name || 'Your account'}</p>
          <p className="eyebrow text-[10px]">Signed in</p>
        </div>
      </div>
      <div className="space-y-0.5">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-[5px] px-3 py-2 text-[14px] transition-colors ${
              isActive ? 'bg-paper-sunk font-medium text-ink' : 'text-ink-soft hover:bg-paper-sunk/70 hover:text-ink'
            }`
          }
        >
          <Icon name="profile" className="h-4 w-4 text-ink-muted" />
          Profile
        </NavLink>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-[5px] px-3 py-2 text-left text-[14px] text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Icon name="logout" className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );
}

// Signed-in layout: fixed sidebar on large screens, top bar + slide-in drawer below 1024px.
export default function AppShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper-raised px-4 py-6 lg:flex">
        <div className="px-2">
          <Wordmark />
        </div>
        <nav aria-label="Main" className="mt-10 flex-1">
          <p className="eyebrow mb-2 px-3">Workspace</p>
          <NavItems />
        </nav>
        <Account onLogout={handleLogout} />
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur-sm lg:hidden">
        <Wordmark />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded p-2 text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          aria-controls="mobile-navigation"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
      </div>

      <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} placement="drawer" id="mobile-navigation" labelledBy="mobile-navigation-label">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="mb-8 flex items-start justify-between px-2">
            <Wordmark />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="-mr-1 rounded p-2 text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink"
              aria-label="Close navigation"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="Main" className="flex-1">
            <p id="mobile-navigation-label" className="eyebrow mb-2 px-3">
              Workspace
            </p>
            <NavItems onNavigate={() => setDrawerOpen(false)} />
          </nav>
          <Account onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} />
        </div>
      </Dialog>

      <main id="main" tabIndex={-1} className="lg:pl-64 focus:outline-none">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
