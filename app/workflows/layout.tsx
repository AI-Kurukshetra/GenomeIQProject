import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function WorkflowsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      description="Configure genomic processing templates, monitor queue state, and stage future Edge Function orchestration."
      heading="Workflows"
    >
      {children}
    </WorkspaceShell>
  );
}
