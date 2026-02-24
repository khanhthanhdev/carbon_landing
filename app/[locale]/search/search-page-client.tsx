"use client";

import { ArrowLeft, Loader2, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { Navigation } from "@/components/navigation";
import { QuestionRequestForm } from "@/components/question-request-form";
import { SearchFilters } from "@/components/search-filters";
import { SearchResults } from "@/components/search-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import qaData from "@/data/qa_new.json";
import { useDebounce } from "@/hooks/use-debounce";
import {
  type SearchMetadata,
  type SearchResult,
  type SearchType,
  useSearch,
} from "@/hooks/use-search";
import type { PrefetchedCategories } from "@/lib/convex-server";

interface PrefetchedQAItem {
  _id: string;
  answer?: string;
  category: string;
  lang?: string;
  question?: string;
  sources?: any[];
}

type QASection = (typeof qaData.sections)[number];
type QAQuestion = QASection["questions"][number];

interface KnowledgeBaseEntry {
  question: QAQuestion;
  section: QASection;
}

interface SearchPageHeaderProps {
  backToHomeLabel: string;
  onBack: () => void;
  onQueryChange: (query: string) => void;
  onSearchTypeChange: (type: SearchType) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  query: string;
  searchType: SearchType;
  subtitle: string;
  title: string;
}

function SearchPageHeader({
  backToHomeLabel,
  onBack,
  onQueryChange,
  onSearchTypeChange,
  onSubmit,
  placeholder,
  query,
  searchType,
  subtitle,
  title,
}: SearchPageHeaderProps) {
  return (
    <>
      <Button
        className="mb-4 -ml-2 text-xs sm:mb-6 sm:text-sm"
        onClick={onBack}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
        {backToHomeLabel}
      </Button>

      <div className="mb-6 text-center sm:mb-8 md:mb-12">
        <h1 className="mb-3 text-balance px-2 font-bold text-2xl text-foreground sm:mb-4 sm:text-3xl md:mb-6 md:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mb-4 text-pretty px-2 text-muted-foreground text-sm sm:mb-6 sm:text-base md:mb-8 md:text-lg">
          {subtitle}
        </p>

        <form className="mb-4 sm:mb-6" onSubmit={onSubmit}>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
            <Input
              className="h-11 pr-3 pl-9 text-sm sm:h-12 sm:pr-4 sm:pl-12 sm:text-base md:h-14"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={placeholder}
              type="text"
              value={query}
            />
          </div>
        </form>

        <div className="mb-3 sm:mb-4">
          <SearchFilters
            onSearchTypeChange={onSearchTypeChange}
            searchType={searchType}
          />
        </div>
      </div>
    </>
  );
}

interface QuestionRequestPanelProps {
  hasResults: boolean;
  message: string;
  query: string;
  title: string;
}

function QuestionRequestPanel({
  hasResults,
  message,
  query,
  title,
}: QuestionRequestPanelProps) {
  return (
    <div
      className={`mt-6 sm:mt-8 ${hasResults ? "rounded-lg border border-muted border-dashed p-4 sm:p-6 md:p-8" : ""}`}
    >
      <div className="mb-4 text-center sm:mb-6">
        <h3 className="mb-2 font-semibold text-base text-foreground sm:text-lg">
          {title}
        </h3>
        <p className="px-2 text-muted-foreground text-xs sm:text-sm">
          {message}
        </p>
      </div>
      <QuestionRequestForm searchQuery={query} />
    </div>
  );
}

interface SearchResultsContentProps {
  initialCategories?: PrefetchedCategories;
  initialQAItems?: PrefetchedQAItem[];
}

interface SearchState {
  query: string;
  type: SearchType;
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildSources(question: QAQuestion) {
  return (question.sources ?? []).map((source) => ({
    title: source.title ?? source.url ?? "View source",
    url: source.url ?? "#",
    type: source.type ?? "reference",
    location: (source as { location?: string }).location ?? "",
  }));
}

function SearchResultsContent({
  initialCategories: _initialCategories,
  initialQAItems: _initialQAItems,
}: SearchResultsContentProps) {
  const t = useTranslations("search");
  const tQuestionRequest = useTranslations("questionRequest");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sections: QASection[] = qaData.sections ?? [];
  const knowledgeBase = useMemo<KnowledgeBaseEntry[]>(
    () =>
      sections.flatMap((section) =>
        section.questions.map((question) => ({
          section,
          question,
        }))
      ),
    [sections]
  );

  const [searchState, setSearchState] = useState<SearchState>({
    query: "",
    type: "fulltext",
  });

  const debouncedSearch = useDebounce(searchState.query, 400);
  const trimmedQuery = debouncedSearch.trim();

  const {
    data: searchData,
    isLoading: isSearching,
    isError,
    error,
    refetch,
  } = useSearch({
    query: debouncedSearch,
    searchType: searchState.type,
    filters: {
      lang: locale,
    },
    enabled: trimmedQuery.length >= 2,
  });

  const localResults = useMemo<SearchResult[]>(() => {
    const normalizedQuery = normalizeText(trimmedQuery);
    if (normalizedQuery.length < 2) {
      return [];
    }

    const baseTerms = normalizedQuery.split(/\s+/).filter(Boolean);

    const scored = knowledgeBase.reduce<[SearchResult, number][]>(
      (acc, { section, question }) => {
        const questionText = normalizeText(question.question);
        const answerText = normalizeText(question.answer);
        const keywordList = (question.metadata?.keywords ?? []).map((keyword) =>
          normalizeText(keyword)
        );

        let score = 0;
        for (const term of baseTerms) {
          if (!term) {
            continue;
          }
          const weight = 1 / baseTerms.length;
          if (questionText.includes(term)) {
            score += 0.5 * weight;
          }
          if (answerText.includes(term)) {
            score += 0.3 * weight;
          }
          if (keywordList.some((keyword) => keyword.includes(term))) {
            score += 0.2 * weight;
          }
        }

        if (baseTerms.length > 0 && questionText.startsWith(baseTerms[0])) {
          score += 0.1;
        }

        score = Math.min(score, 1);
        if (score <= 0) {
          return acc;
        }

        acc.push([
          {
            _id: question.id,
            question: question.question,
            answer: question.answer,
            category: question.metadata?.category ?? section.section_title,
            sources: buildSources(question),
            score,
            textScore: score,
            reasons: ["keyword"],
          },
          score,
        ]);

        return acc;
      },
      []
    );

    return scored
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([result]) => result);
  }, [knowledgeBase, trimmedQuery]);

  const localMetadata = useMemo<SearchMetadata | undefined>(() => {
    if (localResults.length === 0) {
      return undefined;
    }
    return {
      totalResults: localResults.length,
      searchType: "local-keyword",
      usedCache: false,
      latencyMs: 0,
      usedVector: false,
      usedFullText: true,
    };
  }, [localResults]);

  const remoteResults = searchData?.results ?? [];
  const remoteMetadata = searchData?.metadata;
  const hasRemoteResults = remoteResults.length > 0;
  const combinedResults = hasRemoteResults ? remoteResults : localResults;
  const combinedMetadata = hasRemoteResults ? remoteMetadata : localMetadata;
  const hasResults = combinedResults.length > 0;

  const hasLowRelevanceScores = useMemo(() => {
    if (combinedResults.length === 0) {
      return false;
    }

    return combinedResults.every((result) => {
      const score = result.score ?? result.vectorScore ?? result.textScore ?? 0;
      return score < 0.2;
    });
  }, [combinedResults]);

  const searchError = hasResults ? null : isError ? error : null;
  const normalizedError = useMemo(
    () =>
      searchError
        ? searchError instanceof Error
          ? searchError
          : new Error(String(searchError))
        : null,
    [searchError]
  );
  const isLoadingResults =
    isSearching && !hasRemoteResults && localResults.length === 0;
  const showQuestionRequestForm =
    !isLoadingResults &&
    trimmedQuery.length >= 2 &&
    (combinedResults.length === 0 ||
      Boolean(normalizedError) ||
      hasLowRelevanceScores);

  useEffect(() => {
    const resolveQueryFromParams = () => {
      const directQuery =
        searchParams.get("q") ??
        searchParams.get("query") ??
        searchParams.get("keyword");

      if (directQuery && directQuery.length > 0) {
        return directQuery;
      }

      const unnamedQuery = searchParams.get("");
      if (unnamedQuery && unnamedQuery.length > 0) {
        return unnamedQuery;
      }

      const firstEntry = searchParams.entries().next().value as
        | [string, string]
        | undefined;
      if (firstEntry && firstEntry[0] === "" && firstEntry[1]) {
        return firstEntry[1];
      }

      return undefined;
    };

    const nextQuery = resolveQueryFromParams();
    const typeParam = searchParams.get("type");
    const nextType: SearchType | undefined =
      typeParam === "vector" || typeParam === "fulltext"
        ? typeParam
        : typeParam === "hybrid" || !typeParam
          ? "fulltext"
          : undefined;

    setSearchState((prev) => {
      const resolvedQuery = typeof nextQuery === "string" ? nextQuery : "";
      const resolvedType = nextType ?? prev.type;

      if (prev.query === resolvedQuery && prev.type === resolvedType) {
        return prev;
      }

      return {
        query: resolvedQuery,
        type: resolvedType,
      };
    });
  }, [searchParams]);

  const updateURL = (params: { query?: string; type?: SearchType }) => {
    const newSearchParams = new URLSearchParams(searchParams);

    if (params.query !== undefined) {
      if (params.query.trim()) {
        newSearchParams.set("q", params.query.trim());
      } else {
        newSearchParams.delete("q");
      }
    }

    if (params.type !== undefined) {
      if (params.type !== "fulltext") {
        newSearchParams.set("type", params.type);
      } else {
        newSearchParams.delete("type");
      }
    }

    const newURL = `${pathname}?${newSearchParams.toString()}`;
    router.replace(newURL, { scroll: false });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateURL({ query: searchState.query });
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchState((prev) => (prev.type === type ? prev : { ...prev, type }));
    updateURL({ type });
  };

  const handleBack = () => {
    router.push(`/${locale}`);
  };

  const questionRequestMessage = normalizedError
    ? `${t("errorMessage")} ${tQuestionRequest("subtitle")}`
    : hasLowRelevanceScores
      ? t("lowRelevanceMessage")
      : tQuestionRequest("subtitle");

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-20 pb-8 sm:pt-24 sm:pb-12 md:pt-28 md:pb-16 lg:pt-32 lg:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SearchPageHeader
              backToHomeLabel={t("backToHome")}
              onBack={handleBack}
              onQueryChange={(query) =>
                setSearchState((prev) =>
                  prev.query === query ? prev : { ...prev, query }
                )
              }
              onSearchTypeChange={handleSearchTypeChange}
              onSubmit={handleSearch}
              placeholder={t("placeholder")}
              query={searchState.query}
              searchType={searchState.type}
              subtitle={t("subtitle")}
              title={t("title")}
            />

            <div className="w-full">
              <SearchResults
                error={normalizedError}
                isLoading={isLoadingResults}
                metadata={combinedMetadata}
                onClearSearch={() =>
                  setSearchState((prev) =>
                    prev.query ? { ...prev, query: "" } : prev
                  )
                }
                onRetry={() => refetch()}
                query={trimmedQuery}
                results={combinedResults}
              />

              {showQuestionRequestForm && (
                <QuestionRequestPanel
                  hasResults={hasResults}
                  message={questionRequestMessage}
                  query={trimmedQuery}
                  title={tQuestionRequest("title")}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

interface SearchPageClientProps {
  initialCategories?: PrefetchedCategories;
  initialQAItems?: PrefetchedQAItem[];
}

function SearchPageClientContent({
  initialCategories,
  initialQAItems,
}: SearchPageClientProps) {
  return (
    <SearchResultsContent
      initialCategories={initialCategories}
      initialQAItems={initialQAItems}
    />
  );
}

export default function SearchPageClient({
  initialCategories,
  initialQAItems,
}: SearchPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SearchPageClientContent
        initialCategories={initialCategories}
        initialQAItems={initialQAItems}
      />
    </Suspense>
  );
}
