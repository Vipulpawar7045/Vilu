export const COLLECTION_PAGE_TYPES = [
  "homepage",
  "pricing",
  "product",
  "documentation",
  "careers",
  "changelog",
  "status",
] as const;

export type CollectionPageType = (typeof COLLECTION_PAGE_TYPES)[number];

export const COLLECTION_REVIEW_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "not-needed",
] as const;

export type CollectionReviewStatus = (typeof COLLECTION_REVIEW_STATUSES)[number];
