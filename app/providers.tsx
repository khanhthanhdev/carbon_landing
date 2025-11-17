"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable.");
}

export function PostHogProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (!posthog.__loaded) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: "/api/carbon-insights/",
        ui_host: "https://us.posthog.com",
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export function Providers({ children }: PropsWithChildren) {
  const [convexClient] = useState(
    () =>
      new ConvexReactClient(convexUrl, {
        unsavedChangesWarning: false,
      }),
  );

  const [convexQueryClient] = useState(() => new ConvexQueryClient(convexClient));

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
            staleTime: Infinity,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
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
    <PostHogProvider>
      <ConvexProvider client={convexClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ConvexProvider>
    </PostHogProvider>
  );
}
