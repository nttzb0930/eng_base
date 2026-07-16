import { useMutation } from "@tanstack/react-query";
import { authService } from "@/src/services/auth/auth.service";

export function useAdminLogin() {
  return useMutation({
    mutationFn: authService.login,
  });
}
