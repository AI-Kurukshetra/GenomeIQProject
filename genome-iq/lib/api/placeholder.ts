import { NextResponse } from "next/server";

export function buildApiPlaceholder(group: string, scope: string[]) {
  return NextResponse.json(
    {
      implemented: false,
      message: `${group} API group is scaffolded but not fully implemented yet.`,
      scope,
    },
    { status: 501 },
  );
}
