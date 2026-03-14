"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerAction } from "@/app/auth/actions";
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

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialAuthActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an organization workspace</CardTitle>
        <CardDescription>
          Provision a tenant-scoped environment for clinical geneticists, patient
          cohorts, and downstream genomic interpretation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {state.status !== "idle" ? (
          <Alert variant={state.status === "error" ? "destructive" : "success"}>
            <AlertTitle>
              {state.status === "error" ? "Registration failed" : "Verification required"}
            </AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-5">
          <input name="redirectTo" type="hidden" value="/dashboard" />

          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
            <Input
              id="organizationName"
              name="organizationName"
              placeholder="Precision Oncology Lab"
              required
              type="text"
            />
            <p className="text-xs leading-5 text-slate-500">
              This organization becomes the security boundary for patients,
              samples, variants, and reports.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <Input
              autoComplete="email"
              id="email"
              name="email"
              placeholder="you@hospital.org"
              required
              type="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="font-mono text-xs text-slate-500">Min 8 chars</span>
            </div>
            <Input
              autoComplete="new-password"
              id="password"
              minLength={8}
              name="password"
              placeholder="Create a strong password"
              required
              type="password"
            />
          </div>

          <SubmitButton className="w-full" pendingLabel="Creating workspace...">
            Create Account
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function RegisterFooter() {
  return (
    <p>
      Already have access?{" "}
      <Link
        className="font-semibold text-slate-950 transition-colors hover:text-slate-700"
        href="/auth/login"
      >
        Sign in
      </Link>
      .
    </p>
  );
}
