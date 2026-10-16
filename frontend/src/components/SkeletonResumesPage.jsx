import SkeletonResumeRow from './SkeletonResumeRow';

export default function SkeletonResumesPage() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading resumes">
      <div className="mb-8 border-b border-line pb-6">
        <div className="mb-4 h-3 w-24 rounded bg-paper-sunk" />
        <div className="h-12 w-2/3 max-w-md rounded bg-paper-sunk" />
      </div>
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="h-10 rounded bg-paper-sunk" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-56 rounded-md bg-paper-sunk" />
            <div className="h-56 rounded-md bg-paper-sunk" />
          </div>
        </div>
        <div className="divide-y divide-line lg:col-span-5">
          {[1, 2, 3].map((i) => (
            <SkeletonResumeRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
