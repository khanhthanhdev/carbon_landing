import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { MainSearchSection } from "@/components/main-search-section";
import { BookRecommendation } from "@/components/book-recommendation";
import { CommonQuestionsSection } from "@/components/common-questions-section";
import { KnowledgeOverview } from "@/components/knowledge-overview";
import { BookFlipSection } from "@/components/book-flip-section";
import { TrainingDetails } from "@/components/training-details";
import { Footer } from "@/components/footer";
import { FeedbackForm } from "@/components/feedback-form";
import { FeedbackSection } from "@/components/feedback-section";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main className="bg-background">
        <Hero />
        <MainSearchSection />
        <KnowledgeOverview />
        <BookRecommendation />
        <CommonQuestionsSection />
        {/* <BookFlipSection />
        <TrainingDetails /> */}
        <FeedbackSection />
      </main>
      <Footer />
    </>
  );
}
