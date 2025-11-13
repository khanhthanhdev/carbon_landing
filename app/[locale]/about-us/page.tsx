import { buildPageMetadata } from "@/lib/seo";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { AboutUsSection } from "@/components/about-us-section";
import { SurveySection } from "@/components/survey-section";
import { locales } from "@/i18n/request";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata("aboutUs", locale);
}

export default function AboutUsPage() {
  return (
    <>
      <Navigation />
      <main className="bg-background">
        <AboutUsSection />
        <SurveySection />
      </main>
      <Footer />
    </>
  );
}