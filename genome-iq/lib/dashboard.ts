import type { User as AuthUser } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export interface DashboardContext {
  user: AuthUser;
  role: UserRole;
  organizationId: string | null;
  organizationName: string;
  organizationType: string;
}

export interface DashboardStats {
  totalPatients: number;
  samplesProcessed: number;
  totalSamples: number;
  variantsFound: number;
  reportsGenerated: number;
}

function getFallbackRole(role: UserRole | null | undefined): UserRole {
  return role ?? "clinician";
}

export async function getDashboardContext(): Promise<DashboardContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = getFallbackRole(profile?.role);
  const organizationId = profile?.organization_id ?? null;

  if (!organizationId) {
    return {
      user,
      role,
      organizationId: null,
      organizationName: "Provisioning in progress",
      organizationType: "Pending",
    };
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("name, type")
    .eq("id", organizationId)
    .maybeSingle();

  return {
    user,
    role,
    organizationId,
    organizationName: organization?.name ?? "Unknown organization",
    organizationType: organization?.type ?? "Clinical workspace",
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalPatients },
    { count: samplesProcessed },
    { count: totalSamples },
    { count: variantsFound },
    { count: reportsGenerated },
  ] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase
      .from("genomic_samples")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase.from("genomic_samples").select("*", { count: "exact", head: true }),
    supabase.from("variants").select("*", { count: "exact", head: true }),
    supabase.from("clinical_reports").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalPatients: totalPatients ?? 0,
    samplesProcessed: samplesProcessed ?? 0,
    totalSamples: totalSamples ?? 0,
    variantsFound: variantsFound ?? 0,
    reportsGenerated: reportsGenerated ?? 0,
  };
}
