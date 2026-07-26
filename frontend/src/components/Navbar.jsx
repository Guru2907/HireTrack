import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// TODO — Phase 2: style this properly, add active-link highlighting
export default function Navbar() {
  const { isLoggedIn, logout } = useAuth();
  return (
    <nav className="flex justify-between items-center px-6 py-4 border-b">
      <Link to="/" className="font-bold text-lg">HireTrack</Link>
      <div className="flex gap-4">
        {isLoggedIn ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/applications">Applications</Link>
            <Link to="/matcher">Matcher</Link>
            <Link to="/profile">Profile</Link>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}
