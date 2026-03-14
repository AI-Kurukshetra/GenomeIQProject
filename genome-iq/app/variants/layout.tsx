import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function VariantsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      description="Review parsed variants, triage interpretation priorities, and preview downstream literature, phenotype matching, and pharmacogenomics modules."
      heading="Variants"
    >
      {children}
    </WorkspaceShell>
  );
}
