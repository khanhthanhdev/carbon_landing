"use client";

import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Star,
} from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { Button } from "@/components/ui/button";
import { useRecommendedBook } from "@/hooks/use-recommended-book";
import { Link } from "@/lib/navigation";

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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handleLinkClick = (url: string) => {
    window.open(url, "_blank");
  };

  const FALLBACK_BOOK = {
    title: t("fallback.title"),
    authors:
      AUTHORS_DATA[locale as keyof typeof AUTHORS_DATA] || AUTHORS_DATA.vi,
    description: t("fallback.description"),
    coverImage: locale === "en" ? "/cover_en.jpg" : "/cover_vi.jpg",
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
      <section
        className="bg-muted/20 py-6 pt-16 sm:py-8 sm:pt-0 md:py-10 lg:py-8 xl:py-10"
        id="book"
      >
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-4 text-center sm:mb-6 md:mb-8 lg:mb-6 xl:mb-8">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-primary sm:mb-4 sm:gap-2 sm:px-3 sm:py-1.5 md:mb-6 md:px-4 md:py-2">
              <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />
              <span className="font-medium text-xs sm:text-sm">
                {t("badge")}
              </span>
            </div>
            <h2 className="mb-2 text-balance px-2 font-bold text-foreground text-xl sm:mb-3 sm:text-2xl md:mb-4 md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl">
              {t("title")}
            </h2>
            <p className="mx-auto max-w-2xl text-pretty px-2 text-muted-foreground text-sm sm:text-base md:text-lg">
              {t("description")}
            </p>
          </div>

          <div className="mx-auto max-w-7xl">
            <div className="grid min-h-[400px] gap-4 sm:gap-6 md:min-h-[450px] md:grid-cols-2 md:gap-8 lg:min-h-[500px] lg:gap-8 xl:gap-10">
              <div className="flex h-full items-center justify-center md:justify-start">
                <div className="h-[250px] w-[187px] animate-pulse rounded-lg bg-muted sm:h-[300px] sm:w-[225px] md:h-[350px] md:w-[262px] lg:h-[400px] lg:w-[300px] xl:h-[450px] xl:w-[337px]" />
              </div>
              <div className="flex h-full flex-col justify-center text-center md:text-left">
                <div className="mx-auto h-3 w-1/4 rounded bg-muted sm:h-4 md:mx-0" />
                <div className="mx-auto mt-2 h-6 w-3/4 rounded bg-muted sm:h-8 md:mx-0" />
                <div className="mx-auto mt-2 h-3 w-1/3 rounded bg-muted sm:h-4 md:mx-0" />
                <div className="mt-3 h-12 w-full rounded bg-muted/80 sm:h-16" />
                <div className="mt-4 flex flex-col justify-center gap-4 sm:flex-row sm:gap-6 md:justify-start md:gap-8">
                  <div className="flex w-32 items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 sm:w-36">
                    <div className="h-5 w-5 rounded bg-muted sm:h-6 sm:w-6" />
                    <div className="h-4 w-20 rounded bg-muted sm:h-5 sm:w-24" />
                  </div>
                  <div className="flex w-32 items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 sm:w-36">
                    <div className="h-5 w-5 rounded bg-muted sm:h-6 sm:w-6" />
                    <div className="h-4 w-20 rounded bg-muted sm:h-5 sm:w-24" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <div className="h-8 w-full rounded bg-muted/50 sm:h-10 sm:w-28" />
                  <div className="h-8 w-full rounded bg-muted/50 sm:h-10 sm:w-28" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section
      className="bg-muted/20 py-6 pt-16 sm:py-8 sm:pt-0 md:py-10 lg:py-8 xl:py-10"
      id="book"
    >
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="mb-4 text-center sm:mb-6 md:mb-8 lg:mb-6 xl:mb-8">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-primary sm:mb-4 sm:gap-2 sm:px-3 sm:py-1.5 md:mb-6 md:px-4 md:py-2">
            <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />
            <span className="font-medium text-xs sm:text-sm">{t("badge")}</span>
          </div>
          <h2 className="mb-2 text-balance px-2 font-bold text-foreground text-xl sm:mb-3 sm:text-2xl md:mb-4 md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-3xl text-pretty px-2 text-muted-foreground text-sm sm:text-base md:text-lg">
            {t("description")}
          </p>
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="grid min-h-[400px] gap-4 sm:gap-6 md:min-h-[450px] md:grid-cols-2 md:gap-8 lg:min-h-[500px] lg:gap-8 xl:gap-10">
            <div className="order-1 flex h-full items-center justify-center md:justify-start">
              <div className="group relative flex justify-center">
                <Image
                  alt={bookData.title}
                  className="relative w-full max-w-[280px] rounded-lg shadow-xl transition-transform duration-300 group-hover:scale-105 sm:max-w-[340px] md:max-w-[400px] lg:max-w-[480px] xl:max-w-[550px]"
                  height={700}
                  priority
                  src={
                    bookData.coverImage ??
                    "/carbon-markets-book-cover-with-green-leaf-design.jpg"
                  }
                  width={550}
                />
              </div>
            </div>

            <div className="order-2 flex h-full flex-col justify-center text-center md:text-left">
              <div className="mb-3 flex items-center gap-1 sm:mb-4">
                {Array.from(
                  { length: 5 },
                  (_, starNumber) => starNumber + 1
                ).map((starNumber) => (
                  <Star
                    className="h-4 w-4 fill-primary text-primary sm:h-5 sm:w-5 md:h-6 md:w-6"
                    key={`rating-star-${starNumber}`}
                  />
                ))}
                <span className="ml-2 text-muted-foreground text-sm sm:text-base">
                  {t("rating")}
                </span>
              </div>

              <h3
                className="hyphens-auto break-words text-center font-bold text-foreground text-lg leading-tight sm:text-xl md:text-left md:text-2xl lg:text-3xl xl:text-4xl"
                data-tour="book-title"
              >
                {bookData.title}
              </h3>
              {bookData.authors &&
                Array.isArray(bookData.authors) &&
                bookData.authors.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:gap-2 md:justify-start">
                    {bookData.authors.map((author: any) => (
                      <button
                        className="inline-flex cursor-pointer items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-semibold text-primary text-xs transition-colors duration-200 hover:border-primary/40 hover:bg-primary/20 sm:px-3 sm:py-1.5 sm:text-sm md:text-base"
                        key={`${author.name}-${author.link}`}
                        onClick={() => window.open(author.link, "_blank")}
                      >
                        {author.name}
                      </button>
                    ))}
                  </div>
                )}

              {bookData.description && (
                <div className="space-y-3">
                  <div
                    className={`relative ${isDescriptionExpanded ? "" : "max-h-48 overflow-hidden"}`}
                  >
                    <RichTextRenderer
                      className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-pretty text-justify text-foreground text-sm leading-relaxed sm:text-base md:text-left md:text-lg"
                      content={bookData.description}
                    />
                    {!isDescriptionExpanded && (
                      <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-gradient-to-t from-background to-transparent" />
                    )}
                  </div>
                  {bookData.description.length > 200 && (
                    <Button
                      className="h-auto p-0 font-medium text-primary text-sm hover:text-primary/80"
                      onClick={() =>
                        setIsDescriptionExpanded(!isDescriptionExpanded)
                      }
                      size="sm"
                      variant="ghost"
                    >
                      {isDescriptionExpanded ? (
                        <>
                          {t("showLess", { defaultValue: "Show less" })}
                          <ChevronUp className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          {t("showMore", { defaultValue: "Show more" })}
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-col justify-center gap-4 sm:flex-row sm:gap-6 md:justify-start md:gap-8">
                <div className="flex items-center gap-3 rounded-xl border border-muted/40 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/30">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="font-semibold text-foreground text-sm sm:text-base md:text-lg">
                      {t("details.pages")}:{" "}
                      <span className="font-bold text-primary">
                        {bookData.pages ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-muted/40 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/30">
                  <div className="flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="font-semibold text-foreground text-sm sm:text-base md:text-lg">
                      {t("details.year")}:{" "}
                      <span className="font-bold text-primary">
                        {bookData.year ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 md:gap-4">
                {(bookData.purchaseLinks ?? []).map((link, index) => (
                  <Button
                    className={`${
                      index === 0
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : ""
                    } w-full text-sm sm:w-auto sm:text-base`}
                    key={link.retailer}
                    onClick={() => handleLinkClick(link.url)}
                    size="lg"
                    variant={index === 0 ? "default" : "outline"}
                  >
                    <BookOpen className="mr-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    {link.retailer}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 px-3 text-center sm:mt-6 sm:px-4 md:mt-8 lg:mt-6 xl:mt-8">
          <p className="mb-2 text-muted-foreground text-xs sm:mb-3 sm:text-sm md:mb-4">
            {t("cta.note")}
          </p>
          <Button
            asChild
            className="w-full bg-transparent text-sm sm:w-auto sm:text-base"
            size="sm"
            variant="outline"
          >
            <Link href="/books">
              {t("cta.button")}
              <ExternalLink className="ml-2 h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
