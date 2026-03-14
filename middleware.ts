import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

export const middleware = async (request: NextRequest) => {
  const { response, user } = await getSupabaseMiddlewareClient(request);

  const { pathname } = request.nextUrl;
  const isProtectedWorkspaceRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/patients") ||
    pathname.startsWith("/samples") ||
    pathname.startsWith("/variants") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/workflows") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/settings");
  const isAuthRoute = pathname === "/auth/login" || pathname === "/auth/register";

  if (isProtectedWorkspaceRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
};
