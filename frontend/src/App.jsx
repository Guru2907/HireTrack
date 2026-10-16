import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

import PublicLayout from './layouts/PublicLayout';
import AppShell from './layouts/AppShell';

import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import SignupPage from './pages/public/SignupPage';
import NotFoundPage from './pages/public/NotFoundPage';

import DashboardPage from './pages/private/DashboardPage';
import ApplicationsPage from './pages/private/ApplicationsPage';
import ResumeMatcherPage from './pages/private/ResumeMatcherPage';
import ResumesPage from './pages/private/ResumesPage';
import ProfilePage from './pages/private/ProfilePage';

export default function App() {
  return (
    <>
      <Routes>
        {/* Public: top navbar */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Private: everything below requires auth, inside the sidebar shell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/matcher" element={<ResumeMatcherPage />} />
          <Route path="/resumes" element={<ResumesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1B1A17',
            color: '#F7F5F0',
            borderRadius: '5px',
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontSize: '14px',
            padding: '10px 14px',
          },
          success: { iconTheme: { primary: '#5FB89A', secondary: '#1B1A17' } },
          error: { iconTheme: { primary: '#F08A7B', secondary: '#1B1A17' } },
        }}
      />
    </>
  );
}
