import { useState, useEffect } from "react";
import { getAllApplications } from "../../api/applications";
import SkeletonDashboard from "../../components/SkeletonDashboard";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const STATUS_LIST = ["Applied", "Interview", "Offer", "Rejected"];
  const COLORS = ["#9766c5", "#e3aa1a", "#1cdc19", "#b01414"];
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  
useEffect(() => {
  const minDelay = new Promise((resolve) => setTimeout(resolve, 1000));
  Promise.all([getAllApplications(), minDelay])
    .then(([res]) => {
      setApplications(res.data);
      setLoading(false);
    })
    .catch((err) => {
      console.error(err);
      setLoading(false);
    });
}, []);

if (loading) {
  return <SkeletonDashboard />;
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

  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const thisWeekCount = applications.filter(
    (app) => new Date(app.createdAt) >= sevenDaysAgo,
  ).length;
  const lastWeekCount = applications.filter(
    (app) =>
      new Date(app.createdAt) >= fourteenDaysAgo &&
      new Date(app.createdAt) < sevenDaysAgo,
  ).length;

  const sortedByCreated = applications
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const firstAppDate =
    sortedByCreated.length > 0
      ? new Date(sortedByCreated[0].createdAt)
      : new Date();
  const weeksSinceFirst = Math.max(
    1,
    Math.ceil((now - firstAppDate) / (7 * 24 * 60 * 60 * 1000)),
  );
  const avgPerWeek =
    applications.length > 0
      ? (applications.length / weeksSinceFirst).toFixed(1)
      : 0;

  const paceData = [
    { label: "Last Week", count: lastWeekCount },
    { label: "This Week", count: thisWeekCount },
  ];

  const staleApplications = applications.filter((app) => {
    const daysSinceUpdate = Math.floor(
      (now - new Date(app.updatedAt)) / (1000 * 60 * 60 * 24),
    );
    return app.status === "Applied" && daysSinceUpdate >= 10;
  });

  const avgDaysSinceUpdate =
    applications.length > 0
      ? Math.round(
          applications.reduce((sum, app) => {
            const days = Math.floor(
              (now - new Date(app.updatedAt)) / (1000 * 60 * 60 * 24),
            );
            return sum + days;
          }, 0) / applications.length,
        )
      : 0;

  const stalePercent =
    totalCount > 0
      ? Math.round((staleApplications.length / totalCount) * 100)
      : 0;
  const pipelineGaugeData = [{ name: "Stale", value: stalePercent }];

  const rejectedCount = applications.filter(
    (a) => a.status === "Rejected",
  ).length;
  const offerRate =
    totalCount > 0 ? Math.round((offerCount / totalCount) * 100) : 0;
  const rejectionRate =
    totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;

  const respondedApplications = applications.filter(
    (a) => a.status !== "Applied",
  );
  const avgResponseTime =
    respondedApplications.length > 0
      ? Math.round(
          respondedApplications.reduce((sum, app) => {
            const days = Math.floor(
              (new Date(app.updatedAt) - new Date(app.createdAt)) /
                (1000 * 60 * 60 * 24),
            );
            return sum + days;
          }, 0) / respondedApplications.length,
        )
      : null;

  const outcomeData = [
    { label: "Offer Rate", value: offerRate },
    { label: "Rejection Rate", value: rejectionRate },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          {applications.length} applications tracked
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Applied → Interview</p>
          <p className="text-3xl font-bold text-gray-900">
            {applicationToInterviewRate}%
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Interview → Offer</p>
          <p className="text-3xl font-bold text-gray-900">
            {interviewToOfferRate}%
          </p>
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
          <h2 className="font-semibold text-gray-900 mb-7">
            Applications Over Time
          </h2>
          <LineChart width={380} height={280} data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#2563eb" />
          </LineChart>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Application Pace</h2>
          <BarChart width={380} height={220} data={paceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
          <p className="text-sm text-gray-500 mt-2">
            {avgPerWeek} average per week overall
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-6">Pipeline Health</h2>
          <div className="flex items-center gap-10">
            <div className="relative shrink-0">
              <RadialBarChart
                width={220}
                height={220}
                cx="50%"
                cy="50%"
                innerRadius="72%"
                outerRadius="100%"
                barSize={22}
                data={pipelineGaugeData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={12}
                  fill={stalePercent > 40 ? "#ef4444" : "#f97316"}
                />
              </RadialBarChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">
                  {stalePercent}%
                </span>
                <span className="text-sm text-gray-400">stale</span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-2xl text-gray-900">
                  {staleApplications.length}
                  <span className="text-lg text-gray-400 font-normal">
                    {" "}
                    / {totalCount}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  applications need follow-up
                </p>
              </div>
              <div>
                <p className="text-2xl text-gray-900">
                  {avgDaysSinceUpdate}
                  <span className="text-lg text-gray-400 font-normal">
                    {" "}
                    days
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  average since last update
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm md:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">
            Outcome Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={outcomeData} layout="vertical" barSize={40}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="label" width={110} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {outcomeData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={entry.label === "Offer Rate" ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-500 mt-2">
            Average response time:{" "}
            {avgResponseTime !== null
              ? `${avgResponseTime} days`
              : "Not enough data yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
