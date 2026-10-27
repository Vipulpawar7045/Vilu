CREATE TABLE "CollectionCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "title" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseStatus" INTEGER,
    "contentHash" TEXT,
    "previousHash" TEXT,
    "normalizedText" TEXT,
    "changeStatus" TEXT NOT NULL DEFAULT 'new',
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectionCandidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CollectionCandidate_companyId_idx" ON "CollectionCandidate"("companyId");
CREATE INDEX "CollectionCandidate_reviewStatus_idx" ON "CollectionCandidate"("reviewStatus");
CREATE INDEX "CollectionCandidate_url_idx" ON "CollectionCandidate"("url");
