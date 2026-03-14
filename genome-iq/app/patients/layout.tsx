import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function PatientsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      description="Search, review, and create patient records with phenotype capture and downstream links to samples and variants."
      heading="Patients"
    >
      {children}
    </WorkspaceShell>
  );
}
