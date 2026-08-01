import { useState, useEffect } from "react";
import { getAllApplications } from "../../api/applications";
import ApplicationCard from "../../components/ApplicationCard";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const STATUS_LIST = ["Applied", "Interview", "Offer", "Rejected"];
  const COLORS = ["#9766c5", "#e3aa1a", "#1cdc19", "#b01414"];
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllApplications()
      .then((res) => {
        setApplications(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const chartData = STATUS_LIST.map((status) => ({
    name: status,
    value: applications.filter((app) => app.status === status).length,
  }));

  const totalCount = applications.length;

  const interviewCount = applications.filter(
    (app) => app.status === "Interview",
  ).length;

  const offerCount = applications.filter(
    (app) => app.status === "Offer",
  ).length;

  const interviewAndOfferCount = interviewCount + offerCount;

  const applicationToInterviewRate =
    totalCount === 0
      ? 0
      : Math.round((interviewAndOfferCount / totalCount) * 100);

  const interviewToOfferRate =
    interviewAndOfferCount === 0
      ? 0
      : Math.round((offerCount / interviewAndOfferCount) * 100);

  const barData = applications
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((app, index) => ({
      company: app.company,
      date: new Date(app.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      total: index + 1,
    }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">{applications.length} applications tracked</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Applied → Interview</p>
          <p className="text-3xl font-bold text-gray-900">{applicationToInterviewRate}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Interview → Offer</p>
          <p className="text-3xl font-bold text-gray-900">{interviewToOfferRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Status Breakdown</h2>
          <PieChart width={380} height={280}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-7">Applications Over Time</h2>
          <LineChart width={380} height={280} data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#2563eb" />
          </LineChart>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-4">Recent Applications</h2>
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard key={app._id} app={app} />
          ))}
        </div>
      </div>
    </div>
  );
}