import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="max-w-2xl mx-auto text-center py-24 px-4">
      <h1 className="text-4xl font-bold mb-4">HireTrack</h1>
      <p className="text-gray-600 mb-8">
        Track every job application in one place — status, notes, and an AI check
        on how well your resume matches the job description.
      </p>
      <div className="flex gap-4 justify-center">
        <Link to="/signup" className="bg-blue-600 text-white px-5 py-2 rounded">Get Started</Link>
        <Link to="/login" className="border px-5 py-2 rounded">Log In</Link>
      </div>
    </div>
  );
}
