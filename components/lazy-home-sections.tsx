"use client";

import dynamic from "next/dynamic";

export const FeedbackSectionLazy = dynamic(
  () =>
    import("@/components/feedback-section").then((mod) => ({
      default: mod.FeedbackSection,
    })),
  { ssr: false, loading: () => null }
);

export const SponsorsSectionLazy = dynamic(
  () =>
    import("@/components/sponsors-section").then((mod) => ({
      default: mod.SponsorsSection,
    })),
  { ssr: false, loading: () => null }
);
