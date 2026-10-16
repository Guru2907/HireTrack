export default function SkeletonResumeRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 py-4">
      <div className="h-5 w-5 shrink-0 rounded bg-paper-sunk" />
      <div className="space-y-2">
        <div className="h-3.5 w-32 rounded bg-paper-sunk" />
        <div className="h-2.5 w-24 rounded bg-paper-sunk" />
      </div>
    </div>
  );
}
