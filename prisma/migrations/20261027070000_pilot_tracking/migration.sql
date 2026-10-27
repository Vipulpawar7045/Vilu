CREATE TABLE "Pilot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "targetCompanies" INTEGER NOT NULL DEFAULT 25,
    "targetMessages" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Pilot_status_idx" ON "Pilot"("status");
CREATE INDEX "Pilot_createdAt_idx" ON "Pilot"("createdAt");

CREATE TABLE "PilotEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pilotId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "outreachId" TEXT,
    "sourceCategory" TEXT NOT NULL,
    "issueCategory" TEXT NOT NULL,
    "issueCluster" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "evidenceDate" DATETIME,
    "observedAt" DATETIME,
    "lastVerifiedAt" DATETIME,
    "manuallyReviewed" BOOLEAN NOT NULL DEFAULT false,
    "impactScore" INTEGER NOT NULL DEFAULT 1,
    "evidenceScore" INTEGER NOT NULL DEFAULT 1,
    "solutionFitScore" INTEGER NOT NULL DEFAULT 1,
    "reachabilityScore" INTEGER NOT NULL DEFAULT 1,
    "priorityScore" REAL NOT NULL DEFAULT 1,
    "proposedSolution" TEXT NOT NULL,
    "messageSentAt" DATETIME,
    "replyStatus" TEXT NOT NULL DEFAULT 'not-contacted',
    "replySummary" TEXT,
    "objection" TEXT,
    "meetingAt" DATETIME,
    "outcomeStatus" TEXT NOT NULL DEFAULT 'open',
    "outcomeNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PilotEntry_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PilotEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PilotEntry_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PilotEntry_outreachId_fkey" FOREIGN KEY ("outreachId") REFERENCES "Outreach" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PilotEntry_pilotId_createdAt_idx" ON "PilotEntry"("pilotId", "createdAt");
CREATE INDEX "PilotEntry_companyId_idx" ON "PilotEntry"("companyId");
CREATE INDEX "PilotEntry_sourceCategory_idx" ON "PilotEntry"("sourceCategory");
CREATE INDEX "PilotEntry_issueCategory_idx" ON "PilotEntry"("issueCategory");
CREATE INDEX "PilotEntry_outcomeStatus_idx" ON "PilotEntry"("outcomeStatus");
