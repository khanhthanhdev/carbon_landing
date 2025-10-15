"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import type { FormEvent } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearch, type SearchType, type SearchResult, type SearchMetadata } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchFilters } from "@/components/search-filters";
import { SearchResults } from "@/components/search-results";
import { QuestionRequestForm } from "@/components/question-request-form";
import qaData from "@/data/qa_new.json";

type QASection = (typeof qaData.sections)[number];
type QAQuestion = QASection["questions"][number];

interface KnowledgeBaseEntry {
  section: QASection;
  question: QAQuestion;
}

function normalizeText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function buildSources(question: QAQuestion) {
  return (question.sources ?? []).map((source) => ({
    title: source.title ?? source.url ?? "View source",
    url: source.url ?? "#",
    type: source.type ?? "reference",
    location: (source as { location?: string }).location ?? "",
  }));
}

function SearchResultsContent() {
  const t = useTranslations("search");
  const tQuestions = useTranslations("questions");
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
        })),
      ),
    [sections],
  );

  // Search state management
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("hybrid");

  const debouncedSearch = useDebounce(searchQuery, 400);
  const trimmedQuery = debouncedSearch.trim();

  // Main search hook
  const {
    data: searchData,
    isLoading: isSearching,
    isError,
    error,
    refetch,
  } = useSearch({
    query: debouncedSearch,
    searchType,
    filters: {
      lang: locale,
    },
    enabled: trimmedQuery.length >= 2,
  });

  const localResults = useMemo<SearchResult[]>(() => {
    const rawQuery = trimmedQuery;
    const normalizedQuery = normalizeText(rawQuery);
    if (normalizedQuery.length < 2) {
      return [];
    }

    const baseTerms = normalizedQuery.split(/\s+/).filter(Boolean);

    const scored = knowledgeBase.reduce<[SearchResult, number][]>((acc, { section, question }) => {
      const questionText = normalizeText(question.question);
      const answerText = normalizeText(question.answer);
      const keywordList = (question.metadata?.keywords ?? []).map((keyword) => normalizeText(keyword));

      let score = 0;
      for (const term of baseTerms) {
        if (!term) continue;
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

      const result: SearchResult = {
        _id: question.id,
        question: question.question,
        answer: question.answer,
        category: question.metadata?.category ?? section.section_title,
        sources: buildSources(question),
        hybridScore: score,
        textScore: score,
        reasons: ["keyword"],
      };

      acc.push([result, score]);
      return acc;
    }, []);

    return scored
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([result]) => result);
  }, [trimmedQuery, knowledgeBase]);

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
  const hasActiveFilters = searchType !== "hybrid";

  const searchError = hasResults ? null : isError ? error : null;
  const normalizedError = useMemo(
    () => (searchError ? (searchError instanceof Error ? searchError : new Error(String(searchError))) : null),
    [searchError],
  );
  const isLoadingResults = isSearching && !hasRemoteResults && localResults.length === 0;
  
  // Show question request form when:
  // 1. Not loading
  // 2. Query is long enough (>= 2 chars)
  // 3. No results found (either no results or error occurred)
  const showQuestionRequestForm =
    !isLoadingResults && 
    trimmedQuery.length >= 2 && 
    (combinedResults.length === 0 || normalizedError);

  // Debug logging for search state
  console.log("Search state:", {
    trimmedQuery,
    isLoadingResults,
    hasRemoteResults,
    localResultsCount: localResults.length,
    combinedResultsCount: combinedResults.length,
    hasError: !!normalizedError,
    showQuestionRequestForm,
    errorMessage: normalizedError?.message
  });

  // Initialize state from URL parameters
  useEffect(() => {
    const query = searchParams.get("q");
    const type = searchParams.get("type") as SearchType;

    if (query) {
      setSearchQuery(query);
    }
    if (type && ["hybrid", "vector", "fulltext"].includes(type)) {
      setSearchType(type);
    }
  }, [searchParams]);

  // Update URL when search parameters change
  const updateURL = (params: {
    query?: string;
    type?: SearchType;
  }) => {
    const newSearchParams = new URLSearchParams(searchParams);

    if (params.query !== undefined) {
      if (params.query.trim()) {
        newSearchParams.set("q", params.query.trim());
      } else {
        newSearchParams.delete("q");
      }
    }

    if (params.type !== undefined) {
      if (params.type !== "hybrid") {
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
    updateURL({ query: searchQuery });
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    updateURL({ type });
  };

  const handleClearFilters = () => {
    setSearchType("hybrid");
    updateURL({ type: "hybrid" });
  };

  const handleBack = () => {
    router.push(`/${locale}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-6 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToHome")}
            </Button>

            {/* Search Header */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6 text-balance">
                {t("title")}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 text-pretty">
                {t("subtitle")}
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("placeholder")}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                    autoFocus
                  />
                </div>
              </form>

              {/* Search Filters Component */}
              <div className="mb-4">
                <SearchFilters
                  searchType={searchType}
                  onSearchTypeChange={handleSearchTypeChange}
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="w-full">

              {/* Search Results Component */}
              {!showQuestionRequestForm && (
                <SearchResults
                  results={combinedResults}
                  metadata={combinedMetadata}
                  query={trimmedQuery}
                  isLoading={isLoadingResults}
                  error={normalizedError}
                  onRetry={() => refetch()}
                  onClearSearch={() => setSearchQuery("")}
                />
              )}

              {/* Show Question Request Form when no results or error */}
              {showQuestionRequestForm && (
                <div className="mt-8">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {tQuestionRequest("title")}
                    </h3>
                    <p className="text-muted-foreground">
                      {normalizedError 
                        ? t("errorMessage") + " " + tQuestionRequest("subtitle")
                        : tQuestionRequest("subtitle")
                      }
                    </p>
                  </div>
                  <QuestionRequestForm searchQuery={trimmedQuery} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function SearchPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
