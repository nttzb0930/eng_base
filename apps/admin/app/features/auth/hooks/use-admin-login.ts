import { useMutation } from "@tanstack/react-query";

import { authApi } from "../api/auth.api";

export function useAdminLogin() {
  return useMutation({
    mutationFn: authApi.login,
  });
}
