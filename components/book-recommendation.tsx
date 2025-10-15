"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, ShoppingCart, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRecommendedBook } from "@/hooks/use-recommended-book";

const FALLBACK_BOOK = {
  title: "Carbon Markets Starter Guide",
  author: "Carbon Training Lab",
  description:
    "A practical field manual that translates complex carbon market policies into plain language for SME teams. Learn how credits are generated, traded, and verified with real-world examples from Vietnamese enterprises.",
  coverImage: "/carbon-markets-book-cover-with-green-leaf-design.jpg",
  pages: 180,
  publisher: "Carbon Market Institute",
  year: 2024,
  isbn: "978-1-2345-6789-0",
  purchaseLinks: [
    { retailer: "Explore Chapters", url: "/books" },
    { retailer: "Search Answers", url: "/search" },
  ],
};

export function BookRecommendation() {
  const t = useTranslations("bookRecommendation");
  const locale = useLocale();
  const { data: book, isLoading, isError } = useRecommendedBook();
  const bookData = !book || isError ? FALLBACK_BOOK : book;
  const showLoadingState = isLoading && !book;

  const handleLinkClick = (url: string) => {
    if (!url) return;
    const isRelative = url.startsWith("/");
    const targetUrl = isRelative ? `/${locale}${url}` : url;
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (showLoadingState) {
    return (
      <section className="py-12 sm:py-16 lg:py-32 bg-muted/30" id="book">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-4 sm:mb-6">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm font-medium">{t("badge")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance px-2">
              {t("title")}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty px-2">{t("description")}</p>
          </div>

          <Card className="max-w-5xl mx-auto overflow-hidden border-2 shadow-lg">
            <div className="grid md:grid-cols-5 gap-6 sm:gap-8 p-6 sm:p-8 lg:p-12">
              <div className="md:col-span-2 flex items-center justify-center">
                <div className="h-[200px] w-[140px] sm:h-[260px] sm:w-[180px] bg-muted rounded-lg animate-pulse" />
              </div>
              <div className="md:col-span-3 space-y-3">
                <div className="h-6 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted/80 rounded w-1/2" />
                <div className="h-4 bg-muted/60 rounded w-full" />
                <div className="h-4 bg-muted/60 rounded w-5/6" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-10 bg-muted/50 rounded" />
                  <div className="h-10 bg-muted/50 rounded" />
                  <div className="h-10 bg-muted/50 rounded" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 lg:py-32 bg-muted/30" id="book">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-4 sm:mb-6">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm font-medium">{t("badge")}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance px-2">
            {t("title")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty px-2">
            {t("description")}
          </p>
        </div>

        <Card className="max-w-5xl mx-auto overflow-hidden border-2 shadow-lg">
          <div className="grid md:grid-cols-5 gap-6 sm:gap-8 p-6 sm:p-8 lg:p-12">
            <div className="md:col-span-2 flex items-center justify-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-xl group-hover:blur-2xl transition-all" />
                <img
                  src={bookData.coverImage ?? "/carbon-markets-book-cover-with-green-leaf-design.jpg"}
                  alt={bookData.title}
                  className="relative rounded-lg shadow-2xl w-full max-w-[200px] sm:max-w-[280px] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col justify-center">
              <div className="flex items-center gap-1 mb-2 sm:mb-3">
                {[...Array(5)].map((_, index) => (
                  <Star key={index} className="h-4 w-4 sm:h-5 sm:w-5 fill-primary text-primary" />
                ))}
                <span className="text-xs sm:text-sm text-muted-foreground ml-2">{t("rating")}</span>
              </div>

              <h3 className="text-base sm:text-xl md:text-xl lg:text-xl font-bold text-foreground mb-3 text-balance leading-tight break-words hyphens-auto">
                {bookData.title}
              </h3>
              {bookData.author && (
                <p className="text-base sm:text-lg text-muted-foreground mb-3 sm:mb-4">
                  {t("author", { author: bookData.author })}
                </p>
              )}

              {bookData.description && (
                <p className="text-sm sm:text-base text-foreground leading-relaxed mb-4 sm:mb-6 text-pretty">
                  {bookData.description}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm">
                <div>
                  <div className="text-muted-foreground">{t("details.pages")}</div>
                  <div className="font-semibold text-foreground">{bookData.pages ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("details.publisher")}</div>
                  <div className="font-semibold text-foreground truncate">{bookData.publisher ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("details.year")}</div>
                  <div className="font-semibold text-foreground">{bookData.year ?? "—"}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                {(bookData.purchaseLinks ?? []).map((link, index) => (
                  <Button
                    key={link.retailer}
                    variant={index === 0 ? "default" : "outline"}
                    size="sm"
                    className={`${index === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""} w-full sm:w-auto text-xs sm:text-sm`}
                    onClick={() => handleLinkClick(link.url)}
                  >
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    {link.retailer}
                    <ExternalLink className="h-2 w-2 sm:h-3 sm:w-3 ml-2" />
                  </Button>
                ))}
              </div>

              {bookData.isbn && (
                <p className="text-xs text-muted-foreground mt-3 sm:mt-4">ISBN: {bookData.isbn}</p>
              )}
            </div>
          </div>
        </Card>

        <div className="text-center mt-8 sm:mt-12 px-4">
          <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">{t("cta.note")}</p>
          <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent" asChild>
            <Link href={`/${locale}/questions`}>
              {t("cta.button")}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
