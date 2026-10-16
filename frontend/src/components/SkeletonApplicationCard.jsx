// One placeholder row for the applications ledger while it loads.
export default function SkeletonApplicationCard() {
  return (
    <div className="flex animate-pulse items-center gap-6 border-b border-line py-5">
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 rounded bg-paper-sunk" />
        <div className="h-3 w-56 max-w-full rounded bg-paper-sunk" />
      </div>
      <div className="h-7 w-24 rounded-full bg-paper-sunk" />
      <div className="hidden h-3 w-20 rounded bg-paper-sunk md:block" />
      <div className="hidden h-3 w-16 rounded bg-paper-sunk md:block" />
    </div>
  );
}
