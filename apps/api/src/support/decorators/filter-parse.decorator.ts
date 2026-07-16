import {
  createParamDecorator,
  ExecutionContext,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Request } from "express";
import { z, ZodObject } from "zod";

export const DefaultUserQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sort_by: z.string().optional(),
  sort: z.enum(["asc", "desc"]).optional(),
  q: z.string().optional(),
});

export type DefaultUserQueryType = z.infer<typeof DefaultUserQuerySchema>;

interface FilterParseOptions<TSchema extends ZodObject<any>> {
  schema: TSchema;
  allowPagination?: boolean;
  allowSorting?: boolean;
  allowedSortBy?: string[];
  defaultSortBy: string;
  defaultSort: "asc" | "desc";
  searchBy?: string[];
  searchKey?: string; // default 'q'
}

export type InferFilters<TSchema extends ZodObject<any>> = z.infer<TSchema>;

export interface FilterParseResult<TFilters extends Record<string, any>> {
  page: number;
  limit: number;
  hasPage: boolean;
  filters: Partial<TFilters>;
  prismaQuery: {
    where: any;
    skip: number;
    take: number;
    orderBy: any;
  };
}

export const FilterParse = <TSchema extends ZodObject<any>>(
  options: FilterParseOptions<TSchema>,
) =>
  createParamDecorator(
    (
      data: unknown,
      ctx: ExecutionContext,
    ): FilterParseResult<InferFilters<TSchema>> => {
      const request = ctx.switchToHttp().getRequest<Request>();
      const query = request.query;

      // Merge default + custom schema
      const finalSchema = DefaultUserQuerySchema.merge(options.schema);
      const parsed = finalSchema.safeParse(query);
      if (!parsed.success) {
        throw new UnprocessableEntityException(parsed.error.format());
      }

      const validatedQuery = parsed.data as DefaultUserQueryType &
        InferFilters<TSchema>;

      const result = {} as FilterParseResult<InferFilters<TSchema>>;
      const filters = {} as Record<string, any>;

      const qKey = options.searchKey ?? "q";

      const hasPage = query.page !== undefined;
      result.hasPage = hasPage;

      // Pagination
      if (options.allowPagination !== false && hasPage) {
        const page = parseInt(validatedQuery.page ?? "1", 10);
        const limit = parseInt(validatedQuery.limit ?? "10", 10);
        result.page = isNaN(page) || page < 1 ? 1 : page;
        result.limit = isNaN(limit) || limit < 1 ? 10 : limit;
      } else {
        result.page = 1;
        result.limit = 100000;
      }

      // Extract filters (exclude reserved keys)
      (
        Object.keys(validatedQuery) as Array<keyof typeof validatedQuery>
      ).forEach((key) => {
        const k = String(key);
        if (
          ![
            "page",
            "limit",
            "sort",
            "sortBy",
            "sort_by",
            "q",
          ].includes(k) &&
          k !== qKey
        ) {
          filters[k] = validatedQuery[key];
        }
      });

      // Search fields
      if (options.searchBy?.length) {
        const qVal = (validatedQuery as any)[qKey] as string | undefined;
        if (qVal && qVal.trim().length) {
          const or = options.searchBy.map((field) => ({
            [field]: { contains: qVal, mode: "insensitive" as const },
          }));
          filters.OR = or;
        }
      }

      // Sorting
      const orderBy: any = [];
      const orderDirection = validatedQuery.sort ?? options.defaultSort;
      const sortBy =
        validatedQuery.sort_by ??
        validatedQuery.sortBy ??
        options.defaultSortBy;

      if (options.allowSorting !== false && sortBy) {
        const allowedSorts = options.allowedSortBy ?? [];
        if (allowedSorts.includes(sortBy)) {
          orderBy.push({
            [sortBy]: orderDirection,
          });
        }
      }

      result.filters = filters as Partial<InferFilters<TSchema>>;
      result.prismaQuery = {
        where: filters,
        skip: (result.page - 1) * result.limit,
        take: result.limit,
        orderBy,
      };

      return result;
    },
  )();
