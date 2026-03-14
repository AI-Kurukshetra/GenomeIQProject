import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      description="Track patient volume, completed sample processing, discovered variants, and reporting activity for the current organization."
      heading="Dashboard"
    >
      {children}
    </WorkspaceShell>
  );
}
