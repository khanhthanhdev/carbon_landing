"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { UserSync } from "@/components/user-sync";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable.");
}

export function Providers({ children }: PropsWithChildren) {
  const [convexClient] = useState(
    () =>
      new ConvexReactClient(convexUrl, {
        unsavedChangesWarning: false,
      })
  );

  const [convexQueryClient] = useState(
    () => new ConvexQueryClient(convexClient)
  );

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
            staleTime: Number.POSITIVE_INFINITY,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    if (!convexQueryClient.unsubscribe) {
      convexQueryClient.connect(queryClient);
    }
    return () => {
      if (convexQueryClient.unsubscribe) {
        convexQueryClient.unsubscribe();
        convexQueryClient.unsubscribe = undefined;
      }
    };
  }, [convexQueryClient, queryClient]);

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <QueryClientProvider client={queryClient}>
        <UserSync />
        {children}
      </QueryClientProvider>
    </ConvexProviderWithClerk>
  );
}
