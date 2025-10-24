import { buildPageMetadata } from "@/lib/seo";
import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { MainSearchSection } from "@/components/main-search-section";
import { BookRecommendation } from "@/components/book-recommendation";
import { CommonQuestionsSection } from "@/components/common-questions-section";
import { KnowledgeOverview } from "@/components/knowledge-overview";
import { Footer } from "@/components/footer";
import { SurveySection } from "@/components/survey-section";
import { FutureSection } from "@/components/future-section";
import dynamic from "next/dynamic";

// Lazy load below-the-fold components for better performance
const FeedbackSectionLazy = dynamic(() => import("@/components/feedback-section").then(mod => ({ default: mod.FeedbackSection })), { ssr: true });
const SponsorsSectionLazy = dynamic(() => import("@/components/sponsors-section").then(mod => ({ default: mod.SponsorsSection })), { ssr: true });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata("home", locale);
}

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main className="bg-background">
        <Hero />
        <FutureSection />
        <BookRecommendation />
        <KnowledgeOverview />
        <MainSearchSection />

        <CommonQuestionsSection />
        {/* <BookFlipSection />
        <TrainingDetails /> */}
        <FeedbackSectionLazy />
        <SurveySection />
        <SponsorsSectionLazy />
        
      </main>
      <Footer />
    </>
  );
}
