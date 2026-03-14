import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function AnalyticsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      description="Explore operational throughput, cohort trends, phenotype concentration, and preview AI-driven genomic analytics."
      heading="Analytics"
    >
      {children}
    </WorkspaceShell>
  );
}
