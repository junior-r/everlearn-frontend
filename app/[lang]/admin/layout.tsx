import { AdminShell } from "@/widgets/admin-shell";

export default function AdminLayout({ children }: LayoutProps<"/[lang]/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
