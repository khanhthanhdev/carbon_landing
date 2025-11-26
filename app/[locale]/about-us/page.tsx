import { buildPageMetadata, getPageStructuredData } from "@/lib/seo";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { AboutUsSection } from "@/components/about-us-section";
import { SurveySection } from "@/components/survey-section";
import { locales } from "@/i18n/request";
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
  return buildPageMetadata("aboutUs", locale);
}

export default async function AboutUsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const structuredData = getPageStructuredData("aboutUs", locale);

  return (
    <>
      <JsonLd data={structuredData} />
      <Navigation />
      <main className="bg-background">
        <AboutUsSection locale={locale} />
        <SurveySection />
      </main>
      <Footer />
    </>
  );
}