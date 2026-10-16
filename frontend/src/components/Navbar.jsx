import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buttonClasses } from './Button';

// Public navbar (landing, login, signup, 404). Signed-in pages use the sidebar in layouts/AppShell.jsx.
export default function Navbar() {
  const { isLoggedIn } = useAuth();

  return (
    <header className="border-b border-line bg-paper">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="rounded-sm font-display text-[26px] leading-none text-ink">
          Hire<span className="italic text-accent">track</span>
        </Link>

        {isLoggedIn ? (
          <Link to="/dashboard" className={buttonClasses('primary', 'sm')}>
            Open dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/login" className={buttonClasses('ghost', 'sm')}>
              Log in
            </Link>
            <Link to="/signup" className={buttonClasses('primary', 'sm')}>
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
