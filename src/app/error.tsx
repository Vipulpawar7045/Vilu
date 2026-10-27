"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f5] px-6 py-16">
      <section className="max-w-lg rounded-[2rem] border border-[#ead9b5] bg-[#fff8e8] p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a57d35]">
          Something went wrong
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#17201b]">
          Vilu could not load this view.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#75664d]">
          Your saved research is not changed. Try the view again or return to the dashboard.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#17201b] px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-full border border-[#cdbf9e] px-5 py-3 text-sm font-semibold text-[#6e5f45] focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2"
          >
            Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
