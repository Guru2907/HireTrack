import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

const getInitials = (name) => {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
};

export default function Navbar() {
  const { isLoggedIn, logout, name } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="sticky top-3 z-40 flex justify-center px-4">
      <nav className="w-full max-w-5xl bg-white/80 backdrop-blur-md border border-gray-200 rounded-full shadow-sm px-6 py-2.5 flex justify-between items-center">
        <Link to="/" className="font-display font-bold text-lg text-gray-900">HireTrack</Link>

        {isLoggedIn ? (
          <div className="flex items-center gap-8">
            <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link to="/dashboard" className="hover:text-gray-900 transition">Dashboard</Link>
              <Link to="/applications" className="hover:text-gray-900 transition">Applications</Link>
              <Link to="/matcher" className="hover:text-gray-900 transition">Matcher</Link>
              <Link to="/resumes" className="hover:text-gray-900 transition">Resumes</Link>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold hover:bg-blue-700 transition"
              >
                {getInitials(name)}
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{name || "Account"}</p>
                  </div>
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Edit Profile
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link to="/login" className="text-gray-600 hover:text-gray-900 transition">Login</Link>
            <Link to="/signup" className="bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 transition">Sign Up</Link>
          </div>
        )}
      </nav>
    </div>
  );
}