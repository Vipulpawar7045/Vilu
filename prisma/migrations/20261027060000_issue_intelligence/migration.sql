CREATE TABLE "IssueCluster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "neutralSummary" TEXT NOT NULL,
    "category" TEXT,
    "firstSeenAt" DATETIME NOT NULL,
    "latestSeenAt" DATETIME NOT NULL,
    "independentSourceCount" INTEGER NOT NULL DEFAULT 1,
    "resolutionState" TEXT NOT NULL DEFAULT 'open',
    "recencyScore" INTEGER NOT NULL DEFAULT 1,
    "specificityScore" INTEGER NOT NULL DEFAULT 1,
    "sourceReliabilityScore" INTEGER NOT NULL DEFAULT 1,
    "corroborationScore" INTEGER NOT NULL DEFAULT 1,
    "impactScore" INTEGER NOT NULL DEFAULT 1,
    "solutionFitScore" INTEGER NOT NULL DEFAULT 1,
    "rankingScore" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IssueCluster_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IssueCluster_companyId_groupKey_key" ON "IssueCluster"("companyId", "groupKey");
CREATE INDEX "IssueCluster_companyId_resolutionState_idx" ON "IssueCluster"("companyId", "resolutionState");
CREATE INDEX "IssueCluster_rankingScore_idx" ON "IssueCluster"("rankingScore");

ALTER TABLE "IssueSignal" ADD COLUMN "clusterId" TEXT;
CREATE INDEX "IssueSignal_clusterId_idx" ON "IssueSignal"("clusterId");

CREATE TABLE "IssueClusterEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clusterId" TEXT NOT NULL,
    "signalId" TEXT,
    "eventType" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourcePublishedAt" DATETIME,
    "observedAt" DATETIME,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueClusterEvent_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "IssueCluster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueClusterEvent_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "IssueSignal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "IssueClusterEvent_clusterId_createdAt_idx" ON "IssueClusterEvent"("clusterId", "createdAt");
CREATE INDEX "IssueClusterEvent_signalId_idx" ON "IssueClusterEvent"("signalId");

CREATE TABLE "ServiceCapability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "keywords" TEXT NOT NULL,
    "estimatedEffort" TEXT,
    "expectedOutcome" TEXT,
    "nextAction" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ServiceCapability_name_key" ON "ServiceCapability"("name");
CREATE INDEX "ServiceCapability_active_idx" ON "ServiceCapability"("active");

CREATE TABLE "SolutionMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clusterId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL DEFAULT 1,
    "estimatedEffort" TEXT,
    "expectedOutcome" TEXT,
    "nextAction" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'needs-review',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SolutionMatch_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "IssueCluster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SolutionMatch_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "ServiceCapability" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SolutionMatch_clusterId_capabilityId_key" ON "SolutionMatch"("clusterId", "capabilityId");
CREATE INDEX "SolutionMatch_reviewStatus_idx" ON "SolutionMatch"("reviewStatus");

CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyId" TEXT,
    "reviewStatus" TEXT,
    "sourceType" TEXT,
    "minimumScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedSearch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SavedSearch_name_key" ON "SavedSearch"("name");
CREATE INDEX "SavedSearch_companyId_idx" ON "SavedSearch"("companyId");
