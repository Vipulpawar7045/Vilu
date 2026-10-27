import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

export function WorkspacePage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-col gap-5 border-b border-[#dce3da] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7d965b]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-[#17201b] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#69766d]">{description}</p>
          </div>
          <span className="w-fit rounded-full border border-[#dce3da] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#6f7f74]">
            Manual MVP
          </span>
        </header>
        {children}
      </div>
    </AppShell>
  );
}

export function EmptyState({
  label = "Ready for your first record",
  title,
  description,
}: {
  label?: string;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center sm:px-10">
      <div
        className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e8f2dc] text-xl font-bold text-[#77905e]"
        aria-hidden="true"
      >
        +
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#8aa95b]">{label}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">{description}</p>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9890]">{label}</p>
      <p className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[#17201b]">{value}</p>
      <p className="mt-2 text-sm text-[#748078]">{detail}</p>
    </article>
  );
}

export function QueueCard({
  eyebrow,
  title,
  description,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "green" | "yellow";
}) {
  const toneClass = {
    default: "border-[#dce3da] bg-white/65",
    green: "border-[#d4e4c2] bg-[#e8f2dc]/70",
    yellow: "border-[#ead9b5] bg-[#fff8e8]/80",
  }[tone];

  return (
    <article className={`rounded-3xl border p-6 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8aa95b]">{eyebrow}</p>
      <h2 className="mt-4 text-xl font-semibold tracking-[-0.035em] text-[#17201b]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#748078]">{description}</p>
    </article>
  );
}
