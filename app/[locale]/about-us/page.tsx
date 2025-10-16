import { buildPageMetadata } from "@/lib/seo";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { AboutUsSection } from "@/components/about-us-section";

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
      </main>
      <Footer />
    </>
  );
}