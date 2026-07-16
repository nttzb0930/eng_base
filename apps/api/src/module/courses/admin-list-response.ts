import type { Response } from "express";

import type { FilterParseResult } from "../../common/decorators/filter-parse.decorator";

export type AdminListFilter = FilterParseResult<Record<string, unknown>>;
export type AdminListQuery = Omit<
  AdminListFilter["prismaQuery"],
  "skip" | "take"
> &
  Partial<Pick<AdminListFilter["prismaQuery"], "skip" | "take">>;

type AdminListResult = {
  data: unknown[];
  total?: number;
};

export async function sendAdminListResponse(
  response: Response,
  query: AdminListFilter,
  execute: (
    prismaQuery: AdminListQuery,
    includeTotal: boolean
  ) => Promise<AdminListResult>
) {
  if (query.hasPage) {
    const { data, total = 0 } = await execute(query.prismaQuery, true);
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

  const { data } = await execute(
    {
      where: query.prismaQuery.where,
      orderBy: query.prismaQuery.orderBy,
    },
    false
  );
  response.setHeader(
    "Content-Range",
    `items 0-${Math.max(data.length - 1, 0)}/${data.length}`
  );
  response.json(data);
}
