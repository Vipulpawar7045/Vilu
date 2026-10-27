import { NextResponse } from "next/server";

import { COLLECTION_REVIEW_STATUSES } from "@/domain/collection";
import { isCollectionReviewStatus } from "@/lib/collection-service";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const reviewStatus = isRecord(body) ? body.reviewStatus : undefined;
  if (!isCollectionReviewStatus(reviewStatus)) {
    return NextResponse.json(
      { errors: { reviewStatus: `Choose one of: ${COLLECTION_REVIEW_STATUSES.join(", ")}.` } },
      { status: 400 },
    );
  }

  const candidate = await prisma.collectionCandidate.updateMany({
    where: { id },
    data: { reviewStatus },
  });
  if (candidate.count === 0) {
    return NextResponse.json(
      { error: "Collection candidate could not be found." },
      { status: 404 },
    );
  }

  const updated = await prisma.collectionCandidate.findUnique({
    where: { id },
    include: { company: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ candidate: updated });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
