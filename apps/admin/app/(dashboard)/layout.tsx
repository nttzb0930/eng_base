import { AdminShell } from "@/app/components/layout/AdminShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
