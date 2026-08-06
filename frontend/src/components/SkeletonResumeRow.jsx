export default function SkeletonResumeRow() {
  return (
    <div className="flex items-center gap-3 py-4 animate-pulse">
      <div className="h-[18px] w-[18px] bg-gray-200 rounded shrink-0"></div>
      <div className="space-y-2">
        <div className="h-3.5 w-28 bg-gray-200 rounded"></div>
        <div className="h-2.5 w-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}