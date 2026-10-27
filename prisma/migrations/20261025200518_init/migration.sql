-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "industry" TEXT,
    "companyType" TEXT,
    "sizeEstimate" TEXT,
    "location" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "lastResearchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT,
    "publishedAt" DATETIME,
    "sourceUpdatedAt" DATETIME,
    "lastCheckedAt" DATETIME,
    "accessibilityStatus" TEXT NOT NULL DEFAULT 'accessible',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Source_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "snapshotPath" TEXT,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME,
    "snapshotHash" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "impactDescription" TEXT,
    "suggestedSolution" TEXT,
    "expectedOutcome" TEXT,
    "impactScore" INTEGER NOT NULL DEFAULT 1,
    "evidenceScore" INTEGER NOT NULL DEFAULT 1,
    "solutionFitScore" INTEGER NOT NULL DEFAULT 1,
    "reachabilityScore" INTEGER NOT NULL DEFAULT 1,
    "priorityScore" REAL NOT NULL DEFAULT 1,
    "freshnessLabel" TEXT NOT NULL DEFAULT 'Undated',
    "status" TEXT NOT NULL DEFAULT 'new',
    "lastVerifiedAt" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpportunityEvidence" (
    "opportunityId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("opportunityId", "evidenceId"),
    CONSTRAINT "OpportunityEvidence_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpportunityEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "profileUrl" TEXT,
    "contactMethod" TEXT,
    "relevanceNotes" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Outreach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "draftMessage" TEXT NOT NULL,
    "sentAt" DATETIME,
    "followUpAt" DATETIME,
    "responseSummary" TEXT,
    "nextAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Outreach_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Outreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_websiteUrl_key" ON "Company"("websiteUrl");

-- CreateIndex
CREATE INDEX "Source_companyId_idx" ON "Source"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_companyId_url_key" ON "Source"("companyId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_snapshotHash_key" ON "Evidence"("snapshotHash");

-- CreateIndex
CREATE INDEX "Evidence_companyId_idx" ON "Evidence"("companyId");

-- CreateIndex
CREATE INDEX "Evidence_sourceId_idx" ON "Evidence"("sourceId");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_freshnessLabel_idx" ON "Opportunity"("freshnessLabel");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_companyId_title_key" ON "Opportunity"("companyId", "title");

-- CreateIndex
CREATE INDEX "OpportunityEvidence_evidenceId_idx" ON "OpportunityEvidence"("evidenceId");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE INDEX "Outreach_opportunityId_idx" ON "Outreach"("opportunityId");

-- CreateIndex
CREATE INDEX "Outreach_contactId_idx" ON "Outreach"("contactId");

-- CreateIndex
CREATE INDEX "Outreach_status_idx" ON "Outreach"("status");
