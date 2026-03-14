"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/app/auth/actions";
import { initialAuthActionState } from "@/app/auth/state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

function getAlertContent(errorMessage: string | null, actionMessage: string, status: string) {
  if (errorMessage) {
    return {
      variant: "destructive" as const,
      title: "Authentication failed",
      description: errorMessage,
    };
  }

  if (status === "error" && actionMessage) {
    return {
      variant: "destructive" as const,
      title: "Authentication failed",
      description: actionMessage,
    };
  }

  if (status === "success" && actionMessage) {
    return {
      variant: "success" as const,
      title: "Authentication ready",
      description: actionMessage,
    };
  }

  return null;
}

interface LoginFormProps {
  redirectTo: string;
  queryError: string | null;
}

export function LoginForm({ redirectTo, queryError }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialAuthActionState);
  const alertContent = getAlertContent(queryError, state.message, state.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to GenomeIQ</CardTitle>
        <CardDescription>
          Access your organization workspace for VCF review, variant triage, and
          clinical report generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {alertContent ? (
          <Alert variant={alertContent.variant}>
            <AlertTitle>{alertContent.title}</AlertTitle>
            <AlertDescription>{alertContent.description}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-5">
          <input name="redirectTo" type="hidden" value={redirectTo} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              id="email"
              name="email"
              placeholder="clinician@hospital.org"
              required
              type="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="font-mono text-xs text-slate-500">AES-encrypted session</span>
            </div>
            <Input
              autoComplete="current-password"
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              type="password"
            />
          </div>

          <SubmitButton className="w-full" pendingLabel="Signing in...">
            Sign In
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginFooter() {
  return (
    <p>
      New to GenomeIQ?{" "}
      <Link
        className="font-semibold text-slate-950 transition-colors hover:text-slate-700"
        href="/auth/register"
      >
        Create your organization account
      </Link>
      .
    </p>
  );
}
