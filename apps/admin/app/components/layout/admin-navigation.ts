import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  BookOpenText,
  Bookmark,
  CheckSquare,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  Settings,
  Users,
} from "lucide-react";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export type AdminNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavigationParent = {
  id: "courses" | "reading";
  label: string;
  icon: LucideIcon;
  children: AdminNavigationItem[];
};

export type AdminNavigationGroup = {
  id: "content" | "operations" | "system";
  label: string;
  items: Array<AdminNavigationItem | AdminNavigationParent>;
};

export const adminNavigation: AdminNavigationGroup[] = [
  {
    id: "content",
    label: "Nội dung học",
    items: [
      {
        id: "courses",
        label: "Nội dung khóa học",
        icon: GraduationCap,
        children: [
          { href: "/courses", label: "Khóa học", icon: BookOpen },
          { href: "/units", label: "Chương học", icon: Layers },
          { href: "/lessons", label: "Bài học", icon: Bookmark },
          { href: "/challenges", label: "Thử thách", icon: HelpCircle },
          {
            href: "/challenge-options",
            label: "Đáp án",
            icon: CheckSquare,
          },
        ],
      },
      {
        id: "reading",
        label: "Reading",
        icon: BookOpenText,
        children: [
          {
            href: "/reading-passages",
            label: "Passage",
            icon: FileText,
          },
          {
            href: "/reading-source-candidates",
            label: "Duyệt nguồn",
            icon: BookOpenText,
          },
        ],
      },
    ],
  },
  {
    id: "operations",
    label: "Vận hành",
    items: [
      { href: "/users", label: "Người dùng", icon: Users },
      {
        href: "/practice-sessions",
        label: "Phiên luyện tập",
        icon: Activity,
      },
    ],
  },
  {
    id: "system",
    label: "Hệ thống",
    items: [{ href: "/settings", label: "Cấu hình", icon: Settings }],
  },
];

export function isAdminNavigationParent(
  item: AdminNavigationItem | AdminNavigationParent,
): item is AdminNavigationParent {
  return "children" in item;
}

export function isAdminPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminPageTitle(pathname: string) {
  if (pathname.startsWith("/challenge-options")) return "Quản lý đáp án";
  if (pathname.startsWith("/challenges")) return "Quản lý thử thách";
  if (pathname.startsWith("/courses")) return "Quản lý khóa học";
  if (pathname.startsWith("/units")) return "Quản lý chương học";
  if (pathname.startsWith("/lessons")) return "Quản lý bài học";
  if (pathname.startsWith("/reading-source-candidates"))
    return "Kiểm duyệt nguồn Reading";
  if (pathname.startsWith("/reading-passages"))
    return "Quản lý nội dung đọc hiểu";
  if (pathname.startsWith("/users")) return "Quản lý người dùng";
  if (pathname.startsWith("/practice-sessions"))
    return "Lịch sử luyện tập học viên";
  if (pathname.startsWith("/settings")) return "Cấu hình hệ thống";
  return `${appName} Admin`;
}
