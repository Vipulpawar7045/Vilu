"use client";

import Link from "next/link";
import { useState } from "react";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  summary: string;
  href: string;
  companyName: string;
};

export function SearchWorkspace() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as { results?: SearchResult[] };
    setResults(payload.results ?? []);
    setSearched(true);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1 text-sm font-semibold text-[#344239]">
            Search companies, evidence, opportunities, contacts, and sources
            <input
              aria-label="Global search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try a company, excerpt, title, or person"
              className="field-control mt-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="button-primary self-end"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </section>
      {searched &&
        (results.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold text-[#17201b]">No matching records</h2>
            <p className="mt-3 text-sm text-[#748078]">
              Try a broader company name, source title, evidence phrase, or contact name.
            </p>
          </section>
        ) : (
          <section aria-labelledby="search-results-heading">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
                  Workspace search
                </p>
                <h2
                  id="search-results-heading"
                  className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
                >
                  Results for “{query}”
                </h2>
              </div>
              <span className="text-sm text-[#748078]">{results.length} results</span>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {results.map((result) => (
                <article
                  key={`${result.type}-${result.id}`}
                  className="rounded-3xl border border-[#dce3da] bg-white/75 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
                        {formatLabel(result.type)} · {result.companyName}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[#17201b]">{result.title}</h3>
                    </div>
                    <Link href={result.href} className="button-secondary">
                      Open
                    </Link>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#68766e]">{result.summary}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
