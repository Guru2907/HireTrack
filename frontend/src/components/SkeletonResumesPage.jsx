import SkeletonResumeRow from './SkeletonResumeRow';

export default function SkeletonResumesPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded mb-2"></div>
      <div className="h-3 w-72 bg-gray-200 rounded mb-8"></div>

      <div className="rounded-xl p-6 mb-10 border border-gray-200 bg-white">
        <div className="h-4 w-28 bg-gray-200 rounded mb-4"></div>

        <div className="mb-4">
          <div className="h-3 w-12 bg-gray-200 rounded mb-1"></div>
          <div className="h-9 bg-gray-100 rounded"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-100 rounded"></div>
            <div className="h-9 w-28 bg-gray-200 rounded"></div>
          </div>
          <div className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center space-y-3">
            <div className="h-3 w-40 bg-gray-200 rounded"></div>
            <div className="h-9 w-36 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
        {[1, 2, 3].map((i) => (
          <SkeletonResumeRow key={i} />
        ))}
      </div>
    </div>
  );
}