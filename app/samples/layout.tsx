import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function SamplesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      description="Track uploaded VCFs, monitor processing state, and stage downstream interpretation work."
      heading="Samples"
    >
      {children}
    </WorkspaceShell>
  );
}
