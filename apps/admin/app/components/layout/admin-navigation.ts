import {
  Activity,
  Bookmark,
  BookOpen,
  BookOpenText,
  CheckSquare,
  HelpCircle,
  Layers,
  Settings,
  Users,
} from "lucide-react";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export const adminNavigation = [
  { href: "/courses", label: "Khóa học (Courses)", icon: BookOpen },
  { href: "/units", label: "Chương học (Units)", icon: Layers },
  { href: "/lessons", label: "Bài học (Lessons)", icon: Bookmark },
  { href: "/challenges", label: "Thử thách (Challenges)", icon: HelpCircle },
  { href: "/challenge-options", label: "Đáp án (Options)", icon: CheckSquare },
  {
    href: "/reading-passages",
    label: "Đọc hiểu (Reading)",
    icon: BookOpenText,
  },
  {
    href: "/reading-source-candidates",
    label: "Duyệt nguồn Reading",
    icon: BookOpenText,
  },
  { href: "/users", label: "Người dùng (Users)", icon: Users },
  {
    href: "/practice-sessions",
    label: "Lịch sử luyện tập (Practice)",
    icon: Activity,
  },
  { href: "/settings", label: "Cấu hình (Settings)", icon: Settings },
] as const;

export function getAdminPageTitle(pathname: string) {
  if (pathname.startsWith("/courses")) return "Quản lý khóa học";
  if (pathname.startsWith("/units")) return "Quản lý chương học";
  if (pathname.startsWith("/lessons")) return "Quản lý bài học";
  if (pathname.startsWith("/challenges")) return "Quản lý thử thách";
  if (pathname.startsWith("/challenge-options"))
    return "Quản lý đáp án & câu hỏi";
  if (pathname.startsWith("/reading-passages"))
    return "Quản lý nội dung đọc hiểu";
  if (pathname.startsWith("/users")) return "Quản lý người dùng";
  if (pathname.startsWith("/reading-source-candidates"))
    return "Kiểm duyệt nguồn Reading";
  if (pathname.startsWith("/practice-sessions"))
    return "Lịch sử luyện tập học viên";
  if (pathname.startsWith("/settings")) return "Cấu hình hệ thống";
  return `${appName} Admin panel`;
}
