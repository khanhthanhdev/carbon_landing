"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, ShoppingCart, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRecommendedBook } from "@/hooks/use-recommended-book";

export function BookRecommendation() {
  const t = useTranslations("bookRecommendation");
  const locale = useLocale();
  const { data: book, isLoading, isError } = useRecommendedBook();

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank');
  };

  const FALLBACK_BOOK = {
    title: t("fallback.title"),
    author: t("fallback.author"),
    description: t("fallback.description"),
    coverImage: "/book_cover.png",
    pages: 150,
    publisher: t("fallback.publisher"),
    year: 2025,
    // isbn: "978-1-2345-6789-0",
    purchaseLinks: [
      { retailer: t("fallback.retailers.exploreChapters"), url: "/books" },
      { retailer: t("fallback.retailers.searchAnswers"), url: "/search" },
    ],
  };

  const bookData = !book || isError ? FALLBACK_BOOK : book;
  const showLoadingState = isLoading && !book;

  if (showLoadingState) {
    return (
      <section className="py-16 sm:py-20 lg:py-40 bg-muted/30" id="book">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-6 sm:mb-8">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm font-medium">{t("badge")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 text-balance px-2">
              {t("title")}
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty px-2">{t("description")}</p>
          </div>

          <Card className="max-w-7xl mx-auto overflow-hidden border-2 shadow-2xl bg-background/95 backdrop-blur-sm">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 p-8 sm:p-12 lg:p-16">
              <div className="flex items-center justify-center lg:justify-start">
                <div className="h-[400px] w-[300px] sm:h-[500px] sm:w-[375px] lg:h-[550px] lg:w-[412px] bg-muted rounded-xl animate-pulse" />
              </div>
              <div className="flex flex-col justify-center space-y-6">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-12 bg-muted rounded w-4/5" />
                <div className="h-6 bg-muted rounded w-1/2" />
                <div className="h-20 bg-muted/80 rounded w-full" />
                <div className="grid grid-cols-3 gap-4 sm:gap-6 py-4">
                  <div className="h-16 bg-muted/60 rounded-lg" />
                  <div className="h-16 bg-muted/60 rounded-lg" />
                  <div className="h-16 bg-muted/60 rounded-lg" />
                </div>
                <div className="flex gap-4">
                  <div className="h-12 bg-muted/50 rounded w-32" />
                  <div className="h-12 bg-muted/50 rounded w-32" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    );
  }  return (
    <section className="py-16 sm:py-20 lg:py-40 bg-muted/30" id="book">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-6 sm:mb-8">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm font-medium">{t("badge")}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 text-balance px-2">
            {t("title")}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty px-2">{t("description")}</p>
        </div>

        <Card className="max-w-7xl mx-auto overflow-hidden border-2 shadow-2xl bg-background/95 backdrop-blur-sm">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 p-8 sm:p-12 lg:p-16">
            <div className="flex items-center justify-center lg:justify-start">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/10 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500" />
                <img
                  src={bookData.coverImage ?? "/carbon-markets-book-cover-with-green-leaf-design.jpg"}
                  alt={bookData.title}
                  className="relative rounded-xl shadow-3xl w-full max-w-[350px] sm:max-w-[450px] lg:max-w-[500px] group-hover:scale-105 transition-transform duration-500 border-2 border-white/30"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-2 mb-4">
                {[...Array(5)].map((_, index) => (
                  <Star key={index} className="h-5 w-5 sm:h-6 sm:w-6 fill-primary text-primary" />
                ))}
                <span className="text-sm sm:text-base text-muted-foreground ml-2 font-medium">{t("rating")}</span>
              </div>

              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight break-words hyphens-auto">
                {bookData.title}
              </h3>
              {bookData.author && (
                <p className="text-lg sm:text-xl text-muted-foreground font-medium">
                  {t("author", { author: bookData.author })}
                </p>
              )}

              {bookData.description && (
                <p className="text-base sm:text-lg text-foreground leading-relaxed text-pretty">
                  {bookData.description}
                </p>
              )}

              <div className="grid grid-cols-3 gap-4 sm:gap-6 py-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm sm:text-base text-muted-foreground font-medium">{t("details.pages")}</div>
                  <div className="text-lg sm:text-xl font-bold text-foreground mt-1">{bookData.pages ?? "—"}</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm sm:text-base text-muted-foreground font-medium">{t("details.publisher")}</div>
                  <div className="text-sm sm:text-base font-bold text-foreground mt-1 truncate">{bookData.publisher ?? "—"}</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm sm:text-base text-muted-foreground font-medium">{t("details.year")}</div>
                  <div className="text-lg sm:text-xl font-bold text-foreground mt-1">{bookData.year ?? "—"}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {(bookData.purchaseLinks ?? []).map((link, index) => (
                  <Button
                    key={link.retailer}
                    variant={index === 0 ? "default" : "outline"}
                    size="lg"
                    className={`${index === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg" : "border-2"} w-full sm:w-auto text-sm sm:text-base font-semibold`}
                    onClick={() => handleLinkClick(link.url)}
                  >
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {link.retailer}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center mt-12 sm:mt-16 px-4">
          <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">{t("cta.note")}</p>
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
