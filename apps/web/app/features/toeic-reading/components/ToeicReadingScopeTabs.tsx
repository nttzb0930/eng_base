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

import type { ToeicReadingScope } from "../toeic-reading-scope";

type ToeicReadingScopeTabsProps = {
  scope: ToeicReadingScope;
};

const scopes: Array<{
  value: ToeicReadingScope;
  message: "fullTest" | "part5" | "part6" | "part7";
}> = [
  { value: "full", message: "fullTest" },
  { value: 5, message: "part5" },
  { value: 6, message: "part6" },
  { value: 7, message: "part7" },
];

export function ToeicReadingScopeTabs({ scope }: ToeicReadingScopeTabsProps) {
  const t = useTranslations("toeicReading.list");
  const router = useRouter();

  return (
    <div className="w-full sm:w-auto">
      <Select
        value={String(scope)}
        onValueChange={(val) => {
          router.push(`/learn/cert/toeic/reading?scope=${val}`);
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
