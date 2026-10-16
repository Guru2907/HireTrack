import { Link } from 'react-router-dom';
import { buttonClasses } from '../../components/Button';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-28 text-center">
      <p className="eyebrow mb-3">Error 404</p>
      <h1 className="font-display text-[56px] leading-none text-ink">This page isn't in the ledger.</h1>
      <p className="mb-8 mt-4 text-ink-muted">The link may be old, or the address mistyped.</p>
      <Link to="/" className={buttonClasses('secondary')}>
        Go home
      </Link>
    </div>
  );
}
