import { execFileSync } from "node:child_process";
import { unlink } from "node:fs/promises";

import { PrismaClient } from "@prisma/client";

const databaseUrl = "file:./performance.db";
const databasePath = "prisma/performance.db";

async function main() {
  process.env.DATABASE_URL = databaseUrl;
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "db", "push", "--force-reset", "--skip-generate"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    },
  );
  const prisma = new PrismaClient();
  const startedAt = performance.now();
  try {
    const companies = Array.from({ length: 1_000 }, (_, index) => ({
      id: `perf-company-${index}`,
      name: `Performance Company ${index}`,
      websiteUrl: `https://performance-${index}.example`,
      priority: (index % 5) + 1,
    }));
    await prisma.company.createMany({ data: companies });
    await prisma.opportunity.createMany({
      data: companies.map((company, index) => ({
        id: `perf-opportunity-${index}`,
        companyId: company.id,
        title: `Performance opportunity ${index}`,
        category: "website-conversion",
        hypothesis: "A fictional benchmark hypothesis.",
        priorityScore: (index % 5) + 1,
        freshnessLabel: index % 2 === 0 ? "Recent" : "Aging",
        status: "new",
      })),
    });
    const [companyRows, opportunityRows] = await Promise.all([
      prisma.company.findMany({ take: 1_000, orderBy: [{ priority: "desc" }, { name: "asc" }] }),
      prisma.opportunity.findMany({
        take: 1_000,
        include: { company: { select: { name: true } } },
        orderBy: [{ priorityScore: "desc" }, { updatedAt: "desc" }],
      }),
    ]);
    const elapsedMs = Math.round(performance.now() - startedAt);
    if (companyRows.length !== 1_000 || opportunityRows.length !== 1_000)
      throw new Error("Benchmark did not read all generated records.");
    console.log(
      JSON.stringify(
        { companies: companyRows.length, opportunities: opportunityRows.length, elapsedMs },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await unlink(databasePath).catch(() => undefined);
    await unlink(`${databasePath}-journal`).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Performance check failed.");
  process.exitCode = 1;
});
