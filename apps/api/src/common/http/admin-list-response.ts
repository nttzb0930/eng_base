import type { Response } from "express";

import type {
  FilterParseResult,
  ParsedListQuery,
} from "../decorators/filter-parse.decorator";

export type AdminListFilter = FilterParseResult<Record<string, unknown>>;

type AdminListResult = {
  data: unknown[];
  total?: number;
};

export async function sendAdminListResponse(
  response: Response,
  query: AdminListFilter,
  execute: (
    listQuery: ParsedListQuery,
    includeTotal: boolean
  ) => Promise<AdminListResult>
) {
  if (query.hasPage) {
    const { data, total = 0 } = await execute(query.listQuery, true);
    const { limit, page } = query;
    const totalPages = Math.ceil(total / limit);

    response.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
    return;
  }

  const { data } = await execute(query.listQuery, false);
  response.setHeader(
    "Content-Range",
    `items 0-${Math.max(data.length - 1, 0)}/${data.length}`
  );
  response.json(data);
}
