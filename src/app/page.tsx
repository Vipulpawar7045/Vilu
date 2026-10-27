export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f5]">
      <div className="mx-auto max-w-7xl px-6 py-6 sm:px-10 lg:px-12">
        <nav className="flex items-center justify-between" aria-label="Main navigation">
          <a href="#top" className="flex items-center gap-3" aria-label="Vilu home">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#17201b] text-lg font-black text-[#c7f36b]">
              V
            </span>
            <span className="text-xl font-semibold tracking-[-0.04em]">Vilu</span>
          </a>
          <a
            href="/dashboard"
            className="rounded-full border border-[#d9dfd6] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5f6d63] transition hover:border-[#9cac9b] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2"
          >
            Open workspace
          </a>
        </nav>

        <section
          id="top"
          className="grid gap-14 pb-24 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-28"
        >
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9dfd6] bg-white/70 px-4 py-2 text-sm font-medium text-[#536158]">
              <span className="size-2 rounded-full bg-[#8ebd42]" aria-hidden="true" />
              Research what is current, not what is merely visible
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-[#17201b] sm:text-7xl">
              Find the opportunity before it goes stale.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#5f6d63] sm:text-xl">
              Vilu is your private radar for researching companies, preserving recent evidence,
              shaping a useful solution, and reaching out with context.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#workflow"
                className="inline-flex items-center justify-center rounded-full bg-[#17201b] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2a382f] focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2"
              >
                See the workflow{" "}
                <span className="ml-2" aria-hidden="true">
                  ↓
                </span>
              </a>
              <a
                href="#freshness"
                className="inline-flex items-center justify-center rounded-full border border-[#cfd8ce] bg-white/60 px-6 py-3.5 text-sm font-semibold text-[#344239] transition hover:border-[#9cac9b] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2"
              >
                How freshness works
              </a>
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -right-16 -top-16 size-48 rounded-full bg-[#dff5a9] blur-3xl"
              aria-hidden="true"
            />
            <div className="relative rounded-[2rem] border border-[#d6dfd4] bg-[#17201b] p-5 shadow-2xl shadow-[#24352a]/10 sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91a097]">
                    Today&apos;s radar
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">Recent opportunities</p>
                </div>
                <span className="rounded-full bg-[#c7f36b] px-3 py-1 text-xs font-bold text-[#17201b]">
                  7 active
                </span>
              </div>
              <div className="space-y-3 pt-5">
                <OpportunityCard
                  freshness="HOT"
                  title="Signup friction on mobile"
                  company="Northstar Labs"
                  detail="Verified 2 days ago"
                />
                <OpportunityCard
                  freshness="RECENT"
                  title="Support questions repeat in reviews"
                  company="Mosaic Cloud"
                  detail="Verified 9 days ago"
                />
                <OpportunityCard
                  freshness="CHECK"
                  title="Documentation gap after launch"
                  company="Daybreak API"
                  detail="Needs verification"
                  muted
                />
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-xs text-[#aab8ae]">
                <span>Next follow-up</span>
                <span className="font-semibold text-[#c7f36b]">Today · 2:30 PM</span>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-t border-[#dce3da] py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d965b]">
                The workflow
              </p>
              <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-[-0.05em] text-[#17201b]">
                From public signal to useful conversation.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StepCard
                number="01"
                title="Research"
                text="Collect public, permitted signals from websites, reviews, docs, jobs, and changelogs."
              />
              <StepCard
                number="02"
                title="Verify"
                text="Preserve the source, date, evidence, and latest verification before making a claim."
              />
              <StepCard
                number="03"
                title="Solve"
                text="Turn an opportunity hypothesis into a practical solution and measurable outcome."
              />
              <StepCard
                number="04"
                title="Reach out"
                text="Draft a personal message, follow up thoughtfully, and track what happens next."
              />
            </div>
          </div>
        </section>

        <section
          id="freshness"
          className="rounded-[2rem] bg-[#e8f2dc] px-6 py-14 sm:px-10 lg:px-14"
        >
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6d8849]">
                Freshness is a feature
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.05em] text-[#17201b]">
                No stale issue gets a free pass.
              </h2>
              <p className="mt-5 max-w-lg leading-7 text-[#586951]">
                Every opportunity carries its source date, observation date, and last verification.
                Old signals are visible, but they do not quietly enter the outreach queue.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FreshnessCard label="Hot" range="0–7 days" tone="bg-[#17201b] text-white" />
              <FreshnessCard label="Recent" range="8–30 days" tone="bg-white text-[#17201b]" />
              <FreshnessCard label="Aging" range="31–90 days" tone="bg-white/60 text-[#17201b]" />
              <FreshnessCard
                label="Historical"
                range="91+ days"
                tone="border border-[#c5d5b7] bg-transparent text-[#61745b]"
              />
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 py-10 text-sm text-[#738077] sm:flex-row sm:items-center sm:justify-between">
          <p>Vilu · private research, clearer outreach.</p>
          <p>Manual first. Recent always.</p>
        </footer>
      </div>
    </main>
  );
}

function OpportunityCard({
  freshness,
  title,
  company,
  detail,
  muted = false,
}: {
  freshness: string;
  title: string;
  company: string;
  detail: string;
  muted?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border border-white/10 px-4 py-4 ${muted ? "bg-white/[0.03] opacity-70" : "bg-white/[0.08]"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-[10px] font-bold tracking-[0.18em] ${freshness === "HOT" ? "text-[#c7f36b]" : freshness === "CHECK" ? "text-[#f1c56e]" : "text-[#aab8ae]"}`}
        >
          {freshness}
        </span>
        <span className="text-[11px] text-[#84938a]">{detail}</span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs text-[#9eaca2]">{company}</p>
    </article>
  );
}

function StepCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/60 p-6">
      <p className="text-xs font-bold tracking-[0.18em] text-[#8aa95b]">{number}</p>
      <h3 className="mt-8 text-xl font-semibold tracking-[-0.03em] text-[#17201b]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#69766d]">{text}</p>
    </article>
  );
}

function FreshnessCard({ label, range, tone }: { label: string; range: string; tone: string }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl px-5 py-4 ${tone}`}>
      <span className="font-semibold">{label}</span>
      <span className="text-sm opacity-70">{range}</span>
    </div>
  );
}
