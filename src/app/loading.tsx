export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f7f8f5] p-6 sm:p-10" role="status" aria-label="Loading Vilu">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-10 w-32 rounded-2xl bg-[#e3e9e0]" />
        <div className="h-52 rounded-[2rem] bg-[#e8eee5]" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-32 rounded-3xl bg-[#e3e9e0]" />
          <div className="h-32 rounded-3xl bg-[#e3e9e0]" />
          <div className="h-32 rounded-3xl bg-[#e3e9e0]" />
        </div>
      </div>
    </div>
  );
}
