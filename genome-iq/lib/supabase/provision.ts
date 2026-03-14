import type { User as AuthUser, SupabaseClient } from "@supabase/supabase-js";

import type { Database, UserRole } from "@/types";

interface ProvisionResult {
  organizationId: string | null;
  error?: string;
}

type ExistingUserLookup = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "organization_id"
>;

function getRole(value: unknown): UserRole {
  if (value === "researcher" || value === "admin" || value === "clinician") {
    return value;
  }

  return "clinician";
}

function getOrganizationName(
  metadata: Record<string, unknown>,
  fallback?: string,
) {
  const candidate =
    typeof metadata.organization_name === "string"
      ? metadata.organization_name.trim()
      : fallback?.trim();

  return candidate ? candidate : null;
}

export async function provisionUserAccount(
  supabase: SupabaseClient<Database>,
  user: AuthUser,
  fallbackOrganizationName?: string,
): Promise<ProvisionResult> {
  if (!user.email) {
    return {
      organizationId: null,
      error: "Authenticated user is missing an email address.",
    };
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = getRole(metadata.role);
  const organizationName = getOrganizationName(metadata, fallbackOrganizationName);

  const { data: existingUserData, error: existingUserError } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const existingUser = existingUserData as ExistingUserLookup | null;

  if (existingUserError) {
    return {
      organizationId: null,
      error: existingUserError.message,
    };
  }

  let organizationId =
    existingUser?.organization_id ??
    (typeof metadata.organization_id === "string" ? metadata.organization_id : null);

  if (!organizationId && organizationName) {
    organizationId = crypto.randomUUID();

    // Every authenticated account is pinned to an org before handling patient genomic data.
    const { error: organizationError } = await supabase.from("organizations").insert({
      id: organizationId,
      name: organizationName,
      type: "clinical_practice",
    });

    if (organizationError) {
      return {
        organizationId: null,
        error: organizationError.message,
      };
    }
  }

  const { error: userError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      organization_id: organizationId,
      role,
    },
    { onConflict: "id" },
  );

  if (userError) {
    return {
      organizationId,
      error: userError.message,
    };
  }

  await supabase.auth.updateUser({
    data: {
      ...metadata,
      organization_id: organizationId,
      organization_name: organizationName,
      role,
    },
  });

  return { organizationId };
}
