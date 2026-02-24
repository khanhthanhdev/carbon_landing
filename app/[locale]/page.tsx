import { BookRecommendation } from "@/components/book-recommendation";
import { CommonQuestionsSection } from "@/components/common-questions-section";
import { DisclaimerSection } from "@/components/disclaimer-section";
import { Footer } from "@/components/footer";
import { FutureSection } from "@/components/future-section";
import { Hero } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { KnowledgeOverview } from "@/components/knowledge-overview";
import {
  FeedbackSectionLazy,
  SponsorsSectionLazy,
} from "@/components/lazy-home-sections";
import { MainSearchSection } from "@/components/main-search-section";
import { Navigation } from "@/components/navigation";
import { SurveySection } from "@/components/survey-section";
import { TourGuide } from "@/components/tour-guide";
import { locales } from "@/i18n/request";
import { buildPageMetadata, getPageStructuredData } from "@/lib/seo";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata("home", locale);
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const structuredData = getPageStructuredData("home", locale);

  return (
    <>
      <JsonLd data={structuredData} />
      <Navigation />
      <TourGuide />
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
      <DisclaimerSection />
      <Footer />
    </>
  );
}
