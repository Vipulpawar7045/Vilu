CREATE TABLE "AiDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "contactId" TEXT,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptContext" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "draftText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiDraft_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiDraft_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AiDraftEvidence" (
    "draftId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    CONSTRAINT "AiDraftEvidence_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "AiDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiDraftEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("draftId", "evidenceId")
);

CREATE INDEX "AiDraft_opportunityId_idx" ON "AiDraft"("opportunityId");
CREATE INDEX "AiDraft_contactId_idx" ON "AiDraft"("contactId");
CREATE INDEX "AiDraft_status_idx" ON "AiDraft"("status");
CREATE INDEX "AiDraft_kind_idx" ON "AiDraft"("kind");
CREATE INDEX "AiDraftEvidence_evidenceId_idx" ON "AiDraftEvidence"("evidenceId");
