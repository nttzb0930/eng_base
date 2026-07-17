import { useCallback, useState } from "react";

export function useTableControls(options: { initialPageSize?: number } = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(options.initialPageSize ?? 10);
  const [searchQuery, setSearchQueryState] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortOrder("desc");
      return field;
    });
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSort,
  };
}
