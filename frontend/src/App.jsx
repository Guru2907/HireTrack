import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Navbar from './components/Navbar';

import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import SignupPage from './pages/public/SignupPage';
import NotFoundPage from './pages/public/NotFoundPage';

import DashboardPage from './pages/private/DashboardPage';
import ApplicationsPage from './pages/private/ApplicationsPage';
import ResumeMatcherPage from './pages/private/ResumeMatcherPage';
import ResumesPage from './pages/private/ResumesPage';

export default function App() {
  return (
  <>
    <Navbar/>
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Private — everything below requires auth */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/applications" element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />
      <Route path="/matcher" element={<ProtectedRoute><ResumeMatcherPage /></ProtectedRoute>} />
      <Route path="/resumes" element={<ProtectedRoute><ResumesPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </>
  );
}
