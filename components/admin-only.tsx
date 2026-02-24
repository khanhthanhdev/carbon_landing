"use client";

import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";

export function AdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const isAdmin = useQuery(api.users.isAdmin);

  if (isAdmin === undefined) {
    return null; // Loading...
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
