const Block = ({ className }) => <div className={`rounded bg-paper-sunk ${className}`} />;

export default function SkeletonDashboard() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-8 border-b border-line pb-6">
        <Block className="mb-4 h-3 w-40" />
        <Block className="h-12 w-3/4 max-w-xl" />
        <Block className="mt-4 h-4 w-2/3 max-w-lg" />
      </div>
      <div className="mb-12 grid grid-cols-2 border-y border-line sm:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-3 px-5 py-5">
            <Block className="h-3 w-16" />
            <Block className="h-11 w-14" />
            <Block className="h-3 w-24" />
          </div>
        ))}
      </div>
      <Block className="mb-12 h-3 w-full" />
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {[1, 2, 3, 4].map((i) => (
            <Block key={i} className="h-12 w-full" />
          ))}
        </div>
        <Block className="h-48 lg:col-span-5" />
      </div>
    </div>
  );
}
