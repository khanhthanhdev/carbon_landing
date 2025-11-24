"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReactNode } from "react";

export function AdminOnly({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) {
  const isAdmin = useQuery(api.users.isAdmin);

  if (isAdmin === undefined) {
    return null; // Loading...
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
