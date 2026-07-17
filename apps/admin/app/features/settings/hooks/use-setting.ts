import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { settingApi } from "../api/setting.api";

export const settingKeys = {
  all: ["settings"] as const,
  detail: (key: string) => [...settingKeys.all, key] as const,
};

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
