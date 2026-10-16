export default function SkeletonMatcher() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading matcher">
      <div className="mb-8 border-b border-line pb-6">
        <div className="mb-4 h-3 w-28 rounded bg-paper-sunk" />
        <div className="h-12 w-2/3 max-w-md rounded bg-paper-sunk" />
      </div>
      <div className="max-w-2xl space-y-4">
        <div className="h-10 rounded bg-paper-sunk" />
        <div className="h-40 rounded bg-paper-sunk" />
        <div className="h-10 w-32 rounded bg-paper-sunk" />
      </div>
    </div>
  );
}
