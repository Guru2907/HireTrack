export default function SkeletonMatcher() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-pulse">
      <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
        <div className="h-7 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 w-64 bg-gray-200 rounded mb-8"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
        <div className="h-10 w-28 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}