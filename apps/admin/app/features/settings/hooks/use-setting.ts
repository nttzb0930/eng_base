import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateSystemSettingsPayload } from "@repo/shared";

import { settingApi } from "../api/setting.api";

export const settingKeys = {
  all: ["settings"] as const,
  effective: () => [...settingKeys.all, "effective"] as const,
  detail: (key: string) => [...settingKeys.all, key] as const,
};

export function useSystemSettings() {
  return useQuery({
    queryKey: settingKeys.effective(),
    queryFn: () => settingApi.getAll(),
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSystemSettingsPayload) =>
      settingApi.updateAll(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingKeys.effective(), settings);
    },
  });
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: settingKeys.detail(key),
    queryFn: () => settingApi.get(key),
  });
}

export function useUpdateSetting(key: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: string) => settingApi.update(key, value),
    onSuccess: (_data, value) => {
      queryClient.setQueryData(settingKeys.detail(key), value);
    },
  });
}
