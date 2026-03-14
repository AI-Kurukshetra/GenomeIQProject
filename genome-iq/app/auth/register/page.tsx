import type { Metadata } from "next";

import { RegisterFooter, RegisterForm } from "@/app/auth/register/register-form";
import { AuthShell } from "@/components/layout/auth-shell";

export const metadata: Metadata = {
  title: "Register | GenomeIQ",
  description: "Create a tenant-scoped GenomeIQ workspace for your organization.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      badge="Tenant Provisioning"
      description="Create an organization account to secure clinical genomics workflows under a shared workspace."
      footer={<RegisterFooter />}
      title="Start a new workspace"
    >
      <RegisterForm />
    </AuthShell>
  );
}
