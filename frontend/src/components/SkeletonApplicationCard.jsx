export default function SkeletonApplicationCard() {
  return (
    <div className="w-full border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex justify-between items-center animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="h-3 w-24 bg-gray-200 rounded"></div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
        <div className="h-3 w-8 bg-gray-200 rounded"></div>
        <div className="h-3 w-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}