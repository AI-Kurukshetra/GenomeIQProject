import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function ReportsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      description="Draft, review, and package clinical genomic reports with clear versioning and evidence summaries."
      heading="Reports"
    >
      {children}
    </WorkspaceShell>
  );
}
