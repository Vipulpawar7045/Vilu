CREATE TABLE "IssueSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "neutralSummary" TEXT NOT NULL,
    "sourcePublishedAt" DATETIME,
    "sourceUpdatedAt" DATETIME,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME,
    "accessibilityStatus" TEXT NOT NULL DEFAULT 'accessible',
    "responseStatus" INTEGER,
    "fingerprint" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'discovered',
    "independentSourceCount" INTEGER NOT NULL DEFAULT 1,
    "recencyScore" INTEGER NOT NULL DEFAULT 1,
    "specificityScore" INTEGER NOT NULL DEFAULT 1,
    "sourceReliabilityScore" INTEGER NOT NULL DEFAULT 1,
    "corroborationScore" INTEGER NOT NULL DEFAULT 1,
    "impactScore" INTEGER NOT NULL DEFAULT 1,
    "solutionFitScore" INTEGER NOT NULL DEFAULT 1,
    "rankingScore" REAL NOT NULL DEFAULT 1,
    "promotedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IssueSignal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueSignal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IssueSignal_companyId_fingerprint_key" ON "IssueSignal"("companyId", "fingerprint");
CREATE INDEX "IssueSignal_companyId_reviewStatus_idx" ON "IssueSignal"("companyId", "reviewStatus");
CREATE INDEX "IssueSignal_companyId_groupKey_idx" ON "IssueSignal"("companyId", "groupKey");
CREATE INDEX "IssueSignal_sourceType_idx" ON "IssueSignal"("sourceType");
CREATE INDEX "IssueSignal_observedAt_idx" ON "IssueSignal"("observedAt");
