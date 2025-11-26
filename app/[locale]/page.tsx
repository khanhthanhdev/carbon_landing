import { buildPageMetadata, getPageStructuredData } from "@/lib/seo";
import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { MainSearchSection } from "@/components/main-search-section";
import { BookRecommendation } from "@/components/book-recommendation";
import { CommonQuestionsSection } from "@/components/common-questions-section";
import { KnowledgeOverview } from "@/components/knowledge-overview";
import { Footer } from "@/components/footer";
import { SurveySection } from "@/components/survey-section";
import { FutureSection } from "@/components/future-section";
import { FeedbackSectionLazy, SponsorsSectionLazy } from "@/components/lazy-home-sections";
import { locales } from "@/i18n/request";
import { TourGuide } from "@/components/tour-guide";
import { JsonLd } from "@/components/json-ld";

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
      <Footer />
    </>
  );
}
