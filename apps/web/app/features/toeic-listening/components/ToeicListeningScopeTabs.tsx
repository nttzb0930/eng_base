"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

import type { ToeicListeningScope } from "../toeic-listening-scope";

type ToeicListeningScopeTabsProps = {
  scope: ToeicListeningScope;
};

const scopes: Array<{
  value: ToeicListeningScope;
  message: "fullTest" | "part1" | "part2" | "part3" | "part4";
}> = [
  { value: "full", message: "fullTest" },
  { value: 1, message: "part1" },
  { value: 2, message: "part2" },
  { value: 3, message: "part3" },
  { value: 4, message: "part4" },
];

export function ToeicListeningScopeTabs({
  scope,
}: ToeicListeningScopeTabsProps) {
  const t = useTranslations("toeicListening.list");
  const router = useRouter();

  return (
    <div className="w-full sm:w-auto">
      <Select
        value={String(scope)}
        onValueChange={(val) => {
          router.push(`/learn/cert/toeic/listening?mode=level&scope=${val}`);
        }}
      >
        <SelectTrigger className="w-full rounded-xl border-emerald-200/80 bg-card font-semibold text-emerald-800 sm:w-[220px] dark:border-emerald-900 dark:text-emerald-300">
          <SelectValue placeholder={t("scopeLabel")} />
        </SelectTrigger>
        <SelectContent>
          {scopes.map((item) => (
            <SelectItem key={String(item.value)} value={String(item.value)}>
              {t(item.message)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
