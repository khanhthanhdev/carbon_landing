"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, ShoppingCart, Star, FileText, Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { useRecommendedBook } from "@/hooks/use-recommended-book";

// Authors data - moved out of translations since next-intl doesn't support arrays
const AUTHORS_DATA = {
  vi: [
    {
      name: "TS. Lê Duy Anh",
      link: "https://vinuni.edu.vn/vi/people/ts-le-duy-anh/",
    },
    {
      name: "PGS.TS Vũ Anh Dũng",
      link: "https://vinuni.edu.vn/vi/people/pgs-ts-vu-anh-dzung/",
    },
    {
      name: "TS. Trương Thu Hà",
      link: "https://ueb.edu.vn/Don-Vi-Giang-Vien/UEB/TS-TRUONG-THU-HA-/1873/1931/31354",
    },
  ],
  en: [
    {
      name: "Dr. Lê Duy Anh",
      link: "https://vinuni.edu.vn/faculty/dr-le-duy-anh",
    },
    {
      name: "Prof. Dr. Vũ Anh Dũng",
      link: "https://vinuni.edu.vn/faculty/prof-dr-vu-anh-dung",
    },
    {
      name: "Dr. Trương Thu Hà",
      link: "https://vinuni.edu.vn/faculty/dr-truong-thu-ha",
    },
  ],
};

export function BookRecommendation() {
  const t = useTranslations("bookRecommendation");
  const locale = useLocale();
  const { data: book, isLoading, isError } = useRecommendedBook();

  const handleLinkClick = (url: string) => {
    window.open(url, "_blank");
  };

  const FALLBACK_BOOK = {
    title: t("fallback.title"),
    authors:
      AUTHORS_DATA[locale as keyof typeof AUTHORS_DATA] || AUTHORS_DATA.vi,
    description: t("fallback.description"),
    coverImage: "/book_cover.png",
    pages: 150,
    publisher: t("fallback.publisher"),
    year: 2025,
    // isbn: "978-1-2345-6789-0",
    purchaseLinks: [
      {
        retailer: t("fallback.retailers.exploreChapters"),
        url: t("fallback.googleDriveLinks.exploreChapters"),
      },
      {
        retailer: t("fallback.retailers.searchAnswers"),
        url: t("fallback.googleDriveLinks.searchAnswers"),
      },
    ],
  };

  const bookData = !book || isError ? FALLBACK_BOOK : book;
  const showLoadingState = isLoading && !book;

  if (showLoadingState) {
    return (
      <section className="pt-16 sm:pt-0 py-6 sm:py-8 md:py-10 lg:py-8 xl:py-10 bg-muted/20" id="book">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-6 xl:mb-8">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-primary/10 text-primary px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full mb-3 sm:mb-4 md:mb-6">
              <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />
              <span className="text-xs sm:text-sm font-medium">
                {t("badge")}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4 text-balance px-2">
              {t("title")}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty px-2">
              {t("description")}
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-8 xl:gap-10 min-h-[400px] md:min-h-[450px] lg:min-h-[500px]">
              <div className="flex items-center justify-center md:justify-start h-full">
                <div className="h-[250px] w-[187px] sm:h-[300px] sm:w-[225px] md:h-[350px] md:w-[262px] lg:h-[400px] lg:w-[300px] xl:h-[450px] xl:w-[337px] bg-muted rounded-lg animate-pulse" />
              </div>
              <div className="flex flex-col justify-center h-full text-center md:text-left">
                <div className="h-3 sm:h-4 bg-muted rounded w-1/4 mx-auto md:mx-0" />
                <div className="h-6 sm:h-8 bg-muted rounded w-3/4 mx-auto md:mx-0 mt-2" />
                <div className="h-3 sm:h-4 bg-muted rounded w-1/3 mx-auto md:mx-0 mt-2" />
                <div className="h-12 sm:h-16 bg-muted/80 rounded w-full mt-3" />
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 justify-center md:justify-start mt-4">
                  <div className="flex items-center gap-3 bg-muted/60 px-4 py-3 rounded-xl w-32 sm:w-36">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 bg-muted rounded" />
                    <div className="h-4 sm:h-5 bg-muted rounded w-20 sm:w-24" />
                  </div>
                  <div className="flex items-center gap-3 bg-muted/60 px-4 py-3 rounded-xl w-32 sm:w-36">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 bg-muted rounded" />
                    <div className="h-4 sm:h-5 bg-muted rounded w-20 sm:w-24" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                  <div className="h-8 sm:h-10 bg-muted/50 rounded w-full sm:w-28" />
                  <div className="h-8 sm:h-10 bg-muted/50 rounded w-full sm:w-28" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="pt-16 sm:pt-0 py-6 sm:py-8 md:py-10 lg:py-8 xl:py-10 bg-muted/20" id="book">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-6 xl:mb-8">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-primary/10 text-primary px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full mb-3 sm:mb-4 md:mb-6">
            <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />
            <span className="text-xs sm:text-sm font-medium">{t("badge")}</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4 text-balance px-2">
            {t("title")}
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto text-pretty px-2">
            {t("description")}
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-8 xl:gap-10 min-h-[400px] md:min-h-[450px] lg:min-h-[500px]">
            <div className="flex items-center justify-center md:justify-start order-1 h-full">
              <div className="relative group flex justify-center">
                <img
                  src={
                    bookData.coverImage ??
                    "/carbon-markets-book-cover-with-green-leaf-design.jpg"
                  }
                  alt={bookData.title}
                  className="relative rounded-lg shadow-xl w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[480px] xl:max-w-[550px] group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center order-2 h-full text-center md:text-left">
              <div className="flex items-center gap-1 mb-3 sm:mb-4">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 fill-primary text-primary"
                  />
                ))}
                <span className="text-sm sm:text-base text-muted-foreground ml-2">
                  {t("rating")}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground leading-tight break-words hyphens-auto text-center md:text-left">
                {bookData.title}
              </h3>
              {bookData.authors &&
                Array.isArray(bookData.authors) &&
                bookData.authors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 justify-center md:justify-start">
                    {bookData.authors.map((author: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => window.open(author.link, "_blank")}
                        className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm md:text-base font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/20 hover:border-primary/40 transition-colors duration-200 cursor-pointer"
                      >
                        {author.name}
                      </button>
                    ))}
                  </div>
                )}

              {bookData.description && (
                <p className="text-sm sm:text-base md:text-lg text-foreground leading-relaxed text-pretty text-justify md:text-left">
                  {bookData.description}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 justify-center md:justify-start mt-4">
                <div className="flex items-center gap-3 bg-muted/20 px-4 py-3 rounded-xl border border-muted/40 hover:bg-muted/30 transition-colors">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-sm sm:text-base md:text-lg font-semibold text-foreground">
                      {t("details.pages")}: <span className="text-primary font-bold">{bookData.pages ?? "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-muted/20 px-4 py-3 rounded-xl border border-muted/40 hover:bg-muted/30 transition-colors">
                  <div className="flex-shrink-0">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-sm sm:text-base md:text-lg font-semibold text-foreground">
                      {t("details.year")}: <span className="text-primary font-bold">{bookData.year ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                {(bookData.purchaseLinks ?? []).map((link, index) => (
                  <Button
                    key={link.retailer}
                    variant={index === 0 ? "default" : "outline"}
                    size="lg"
                    className={`${
                      index === 0
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : ""
                    } w-full sm:w-auto text-sm sm:text-base`}
                    onClick={() => handleLinkClick(link.url)}
                  >
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-2" />
                    {link.retailer}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-4 sm:mt-6 md:mt-8 lg:mt-6 xl:mt-8 px-3 sm:px-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 md:mb-4">
            {t("cta.note")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto bg-transparent text-sm sm:text-base"
            asChild
          >
            <Link href="/questions">
              {t("cta.button")}
              <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
