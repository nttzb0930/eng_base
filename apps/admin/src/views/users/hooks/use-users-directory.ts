import { useState } from "react";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useUsers, useDeleteUser } from "./use-users";
import { toast } from "sonner";

export function useUsersDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 450);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const usersQuery = useUsers({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearchQuery,
  });

  const deleteUserMutation = useDeleteUser();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUserMutation.mutateAsync(id);
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    }
  };

  const updateSearch = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  return {
    usersQuery,
    searchQuery,
    setSearchQuery: updateSearch,
    currentPage,
    setCurrentPage,
    handleDelete,
  };
}
