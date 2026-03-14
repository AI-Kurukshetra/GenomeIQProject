"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { AuthActionState } from "@/app/auth/state";
import { provisionUserAccount } from "@/lib/supabase/provision";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/dashboard";
  }

  return value;
}

async function getAppOrigin() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = sanitizeRedirectPath(formData.get("redirectTo"));

  if (!email || !password) {
    return {
      status: "error",
      message: "Email and password are required.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  redirect(redirectTo);
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = sanitizeRedirectPath(formData.get("redirectTo"));

  if (!organizationName || !email || !password) {
    return {
      status: "error",
      message: "Organization name, email, and password are required.",
    };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "Use a password with at least 8 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getAppOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      data: {
        organization_name: organizationName,
        role: "clinician",
      },
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  if (data.session && data.user) {
    const provisionResult = await provisionUserAccount(
      supabase,
      data.user,
      organizationName,
    );

    if (provisionResult.error) {
      return {
        status: "error",
        message: provisionResult.error,
      };
    }

    redirect(redirectTo);
  }

  return {
    status: "success",
    message:
      "Check your email to confirm the account. Organization provisioning will finish after verification.",
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
