CREATE TABLE "SourceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseStatus" INTEGER,
    "finalUrl" TEXT,
    "previousHash" TEXT,
    "contentHash" TEXT,
    "normalizedText" TEXT,
    "resultStatus" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'not-needed',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SourceCheck_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SourceCheck_sourceId_checkedAt_idx" ON "SourceCheck"("sourceId", "checkedAt");
CREATE INDEX "SourceCheck_reviewStatus_idx" ON "SourceCheck"("reviewStatus");
CREATE INDEX "SourceCheck_resultStatus_idx" ON "SourceCheck"("resultStatus");
