import type { ReviewSummary } from "@repo/shared/review";

import { webHttpClient } from "@/src/lib/web-http-client";

export type ReviewHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createReviewApi(http: ReviewHttp) {
  return {
    async getDailySummary() {
      return (await http.get<ReviewSummary>("/review/daily/summary")).data;
    },
  };
}

export const reviewApi = createReviewApi(webHttpClient);
