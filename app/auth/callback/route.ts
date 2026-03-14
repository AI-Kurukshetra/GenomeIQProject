import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { provisionUserAccount } from "@/lib/supabase/provision";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  return value;
}

function buildLoginRedirect(request: NextRequest, message: string) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const authError = requestUrl.searchParams.get("error_description");

  if (authError) {
    return buildLoginRedirect(request, authError);
  }

  if (!code) {
    return buildLoginRedirect(request, "Authentication failed. Please try again.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return buildLoginRedirect(request, error.message);
  }

  const user = data.user;

  if (!user) {
    return buildLoginRedirect(request, "Authenticated user could not be resolved.");
  }

  const provisionResult = await provisionUserAccount(supabase, user);

  if (provisionResult.error) {
    return buildLoginRedirect(request, provisionResult.error);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
