import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      description="Manage organization settings, security controls, integration endpoints, and consent policy surfaces."
      heading="Settings"
    >
      {children}
    </WorkspaceShell>
  );
}
