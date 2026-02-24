"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export function UserSync() {
  const { isAuthenticated } = useConvexAuth();
  if (!isAuthenticated) {
    return null;
  }

  return <AuthenticatedUserSync />;
}

function AuthenticatedUserSync() {
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    storeUser().catch((error) => {
      console.error("Failed to sync user:", error);
    });
  }, [storeUser]);

  return null;
}
