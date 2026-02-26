import { AboutUsSection } from "@/components/about-us-section";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { Navigation } from "@/components/navigation";
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
      </main>
      <Footer />
    </>
  );
}
