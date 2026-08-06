import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const FEATURES = [
  { title: "Track every application", description: "Company, role, status, notes — logged in one place, not scattered across a spreadsheet." },
  { title: "Real dashboard analytics", description: "Pipeline health, application pace, outcome breakdown — not just a raw list." },
  { title: "AI resume matching", description: "Paste a job description and get a real score against your saved resume, with specific gaps called out." },
  { title: "Upload a PDF or paste text", description: "Save multiple resume versions however's easiest for you." },
];

const PREVIEW_CARDS = [
  { company: 'Google', role: 'SDE Intern', status: 'Applied', badge: 'bg-gray-200 text-gray-800' },
  { company: 'Stripe', role: 'Backend Engineer', status: 'Interview', badge: 'bg-yellow-200 text-yellow-800' },
  { company: 'Notion', role: 'PM Intern', status: 'Offer', badge: 'bg-green-200 text-green-800' },
];

export default function LandingPage() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto text-center py-28 px-4">
        <p className="text-sm font-medium text-blue-600 mb-2">Welcome back</p>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-4">
          Here's where things stand.
        </h1>
        <p className="text-gray-600 mb-8">
          Jump back into your dashboard to see your latest application activity.
        </p>
        <Link
          to="/dashboard"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-medium text-blue-600 mb-3 tracking-wide">
              Built for the job hunt
            </p>
            <h1 className="font-display text-5xl font-bold text-gray-900 leading-tight mb-6">
              Every application.
              <br />
              One dashboard you'll actually check.
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-md">
              Stop losing track in a spreadsheet. Log applications, watch status
              update in real time, and get an AI check on your resume before you submit.
            </p>
            <div className="flex gap-4">
              <Link to="/signup" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none transition">
                Get Started
              </Link>
              <Link to="/login" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none transition">
                Log In
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {PREVIEW_CARDS.map((card) => (
              <div key={card.company} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{card.company}</p>
                  <p className="text-sm text-gray-500">{card.role}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${card.badge}`}>
                  {card.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
          What's actually in it
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="border-l-2 border-blue-600 pl-5">
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl px-10 py-14 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Stop tracking applications in a spreadsheet.
          </h2>
          <Link to="/signup" className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-medium shadow-sm hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition">
            Get Started — it's free
          </Link>
        </div>
      </section>
    </div>
  );
}