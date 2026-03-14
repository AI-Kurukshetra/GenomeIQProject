import type { Metadata } from "next";

import { LoginFooter, LoginForm } from "@/app/auth/login/login-form";
import { AuthShell } from "@/components/layout/auth-shell";

export const metadata: Metadata = {
  title: "Login | GenomeIQ",
  description: "Sign in to the GenomeIQ clinical genomics workspace.",
};

interface LoginPageProps {
  searchParams?: Promise<{
    redirectedFrom?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const redirectTo =
    params?.redirectedFrom && params.redirectedFrom.startsWith("/")
      ? params.redirectedFrom
      : "/dashboard";
  const queryError = params?.error ?? null;

  return (
    <AuthShell
      badge="Clinical Access"
      description="Sign in to your secured hereditary cancer analysis workspace."
      footer={<LoginFooter />}
      title="Welcome back"
    >
      <LoginForm queryError={queryError} redirectTo={redirectTo} />
    </AuthShell>
  );
}
