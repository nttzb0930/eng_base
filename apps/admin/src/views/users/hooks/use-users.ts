import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/src/services/users/users.service";
import type { CreateUserBody, UpdateUserBody, ListUsersQuery } from "@/src/services/users/create-users.service";

export const userQueryKeys = {
  all: ["users"] as const,
  list: (query: ListUsersQuery) => [...userQueryKeys.all, "list", query] as const,
};

export function useUsers(query: ListUsersQuery) {
  return useQuery({
    queryKey: userQueryKeys.list(query),
    queryFn: () => usersService.getUsers(query),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserBody) => usersService.createUser(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useUpdateUser(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserBody) => usersService.updateUser(id ?? "", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}
