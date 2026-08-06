export default function SkeletonDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-gray-200 rounded"></div>
        <div className="h-3 w-32 bg-gray-200 rounded"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
            <div className="h-7 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-[280px] bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-[220px] bg-gray-100 rounded"></div>
          </div>
        ))}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm md:col-span-2">
          <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-[200px] bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  );
}