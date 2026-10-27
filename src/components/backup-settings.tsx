"use client";

import { useState } from "react";

type Preview = {
  valid: boolean;
  errors: string[];
  summary: Record<string, number>;
  data?: unknown;
};

export function BackupSettings() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [backup, setBackup] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function inspect(file: File) {
    setLoading(true);
    setMessage("");
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const response = await fetch("/api/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const result = (await response.json()) as Preview;
      setPreview(result);
      setBackup(result.valid ? parsed : null);
    } catch {
      setPreview({ valid: false, errors: ["The selected file is not valid JSON."], summary: {} });
      setBackup(null);
    } finally {
      setLoading(false);
    }
  }

  async function importValidated() {
    if (!backup || !preview?.valid) return;
    if (
      !window.confirm(
        "Import this validated backup into the local workspace? Existing matching IDs will be updated.",
      )
    )
      return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true, backup }),
    });
    const result = (await response.json()) as { imported?: Record<string, number>; error?: string };
    setMessage(
      response.ok
        ? `Imported ${Object.values(result.imported ?? {}).reduce((sum, count) => sum + count, 0)} records.`
        : (result.error ?? "Import failed."),
    );
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">Exports</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
          Take research with you
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68766e]">
          Exports preserve source dates, observation dates, verification dates, and outreach state.
          The JSON backup contains the local workspace records for restore.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Download href="/api/exports?type=companies" label="Companies CSV" />
          <Download href="/api/exports?type=opportunities" label="Opportunities CSV" />
          <Download href="/api/exports?type=outreach" label="Outreach CSV" />
          <Download href="/api/exports?type=pilot" label="Pilot outcomes CSV" />
          <Download href="/api/exports?type=backup" label="Full JSON backup" />
        </div>
      </section>
      <section className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
          Privacy boundary
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
          Local-only workspace
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68766e]">
          Vilu currently runs in local mode. Start it with{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs">npm run dev:local</code> or{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs">npm run start:local</code> so
          the workspace listens only on 127.0.0.1. Database files, backups, uploads, screenshots,
          and environment files are excluded from version control.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68766e]">
          Hosted mode is intentionally disabled until authentication, authorization, audit logging,
          encrypted secret storage, and private deployment controls are added. Do not expose this
          local server to the network.
        </p>
        <p className="mt-4 text-xs font-semibold text-[#607a3e]">
          CLI backup: <code className="rounded bg-white/80 px-1 py-0.5">npm run backup</code> ·
          Restore:{" "}
          <code className="rounded bg-white/80 px-1 py-0.5">
            npm run restore -- --file backups/&lt;file&gt; --confirm
          </code>
        </p>
      </section>
      <section className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">Restore</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
          Validate before importing
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68766e]">
          Choose a Vilu JSON backup. Nothing is written until the preview is valid and you
          explicitly confirm the import.
        </p>
        <label className="mt-5 block text-sm font-semibold text-[#344239]">
          Backup JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void inspect(file);
            }}
            className="mt-2 block w-full rounded-xl border border-[#cfd8ce] bg-white/70 p-3 text-sm"
          />
        </label>
        {loading && <p className="mt-4 text-sm text-[#748078]">Validating...</p>}
        {preview && (
          <div
            className={`mt-5 rounded-2xl border p-4 ${preview.valid ? "border-[#d4e4c2] bg-[#f5faef]" : "border-[#f0cbc6] bg-[#fff7f6]"}`}
          >
            <p className={`font-semibold ${preview.valid ? "text-[#607a3e]" : "text-[#a3483e]"}`}>
              {preview.valid ? "Backup is ready to import" : "Backup needs attention"}
            </p>
            {preview.valid ? (
              <>
                <ul className="mt-3 grid gap-1 text-sm text-[#59685f] sm:grid-cols-2">
                  {Object.entries(preview.summary).map(([key, count]) => (
                    <li key={key}>
                      {key}: {count}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void importValidated()}
                  disabled={loading}
                  className="button-primary mt-4"
                >
                  Import validated backup
                </button>
              </>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-[#a3483e]">
                {preview.errors.slice(0, 10).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {message && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-[#e8f2dc] px-3 py-2 text-sm text-[#607a3e]"
          >
            {message}
          </p>
        )}
      </section>
    </div>
  );
}

function Download({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="button-secondary">
      {label}
    </a>
  );
}
