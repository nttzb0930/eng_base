import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { userApi } from "../api/user.api";
import type { CreateUserBody, ListUsersQuery, UpdateUserBody } from "../types/user-management.types";

export const userKeys = {
  all: ["users"] as const,
  list: (query: ListUsersQuery) => [...userKeys.all, "list", query] as const,
};

export function useUsers(query: ListUsersQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => userApi.list(query),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserBody) => userApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserBody) => userApi.update(id ?? "", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
