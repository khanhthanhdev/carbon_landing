"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useAction,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { format } from "date-fns";
import { SignInButton } from "@clerk/nextjs";
import { Edit3, Loader2, Menu, Plus, RefreshCcw, Save, Trash2, X } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { AdminOnly } from "@/components/admin-only";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { htmlToMarkdown, richTextToHtml, richTextToPlainText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

import { QuestionsSidebar } from "./questions-sidebar";

type QADoc = Doc<"qa">;

function FeedbackList() {
  const feedback = useQuery(api.feedback.list);

  if (feedback === undefined) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading feedback...
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageRating =
    feedback.length === 0
      ? 0
      : feedback.reduce((sum, item) => sum + (item.rating ?? 0), 0) /
        feedback.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-4xl font-bold">
            {feedback.length}
          </CardContent>
        </Card>
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">out of 5</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Latest Response
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">
            {feedback[0] ? formatDate(feedback[0].createdAt) : "—"}
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/40">
          <CardTitle className="text-lg">Feedback Inbox</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {feedback.length} {feedback.length === 1 ? "response" : "responses"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {feedback.length === 0 ? (
            <div className="flex items-center justify-center py-12 px-4">
              <p className="text-muted-foreground text-sm">
                No feedback received yet.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[520px]">
              <div className="space-y-3 p-4">
                {feedback.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-lg border bg-card/50 p-4 transition hover:bg-card hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-base">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-900 border-amber-200"
                        >
                          ⭐ {item.rating}/5
                        </Badge>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 mb-2">
                      {item.comment}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value?: number) {
  if (!value) return "—";
  try {
    return format(value, "PPp");
  } catch {
    return "—";
  }
}

type SourceEntry = {
  type: string;
  title: string;
  url: string;
  location: string;
};

type SourcePayload = {
  type?: string;
  title?: string;
  url?: string;
  location?: string;
};

const createEmptySource = (): SourceEntry => ({
  type: "",
  title: "",
  url: "",
  location: "",
});

const extractString = (value: unknown) =>
  typeof value === "string" ? value : "";

const normalizeSources = (rawSources?: unknown): SourceEntry[] => {
  if (!Array.isArray(rawSources)) {
    return [];
  }

  return rawSources.map((source) => {
    if (typeof source === "string") {
      return { ...createEmptySource(), title: source };
    }

    if (source === null || typeof source !== "object") {
      return createEmptySource();
    }

    const typed = source as Record<string, unknown>;
    const title = extractString(typed.title) || extractString(typed.url);

    return {
      type: extractString(typed.type),
      title,
      url: extractString(typed.url),
      location: extractString(typed.location),
    };
  });
};

const toSourcePayload = (entry: SourceEntry): SourcePayload | null => {
  const trimmedTitle = entry.title.trim();
  const trimmedUrl = entry.url.trim();
  const trimmedType = entry.type.trim();
  const trimmedLocation = entry.location.trim();

  if (!trimmedTitle && !trimmedUrl && !trimmedType && !trimmedLocation) {
    return null;
  }

  const payload: SourcePayload = {};
  if (trimmedTitle) payload.title = trimmedTitle;
  if (trimmedUrl) payload.url = trimmedUrl;
  if (trimmedType) payload.type = trimmedType;
  if (trimmedLocation) payload.location = trimmedLocation;

  return payload;
};

const buildSourcePayload = (sources: SourceEntry[]): SourcePayload[] =>
  sources.map(toSourcePayload).filter((value): value is SourcePayload => value !== null);

type FormState = {
  question: string;
  category: string;
  sectionTitle: string;
  sectionNumber: string;
  questionNumber: string;
  lang: string;
  keywords: string;
  answerRich: string;
  answerHtml: string;
  answerText: string;
  sources: SourceEntry[];
};

type LangKey = "vi" | "en";

const buildEmptyForm = (defaultLang = ""): FormState => ({
  question: "",
  category: "",
  sectionTitle: "",
  sectionNumber: "",
  questionNumber: "",
  lang: defaultLang,
  keywords: "",
  answerRich: "",
  answerHtml: "",
  answerText: "",
  sources: [],
});

type LangContent = {
  question: string;
  answerRich: string;
  answerHtml: string;
  answerText: string;
  lang: LangKey;
};

type SharedMeta = {
  category: string;
  sectionTitle: string;
  sectionNumber: string;
  questionNumber: string;
  keywords: string;
  sources: SourceEntry[];
};

type QuestionsCRMProps = {
  initialMode?: "new" | "list";
  defaultLang?: string;
  hideSidebar?: boolean;
};

function QuestionsCRM({ initialMode = "list", defaultLang = "", hideSidebar = false }: QuestionsCRMProps) {
  const { toast } = useToast();
  const saveQA = useAction(api.admin.saveQAWithEmbeddings);
  const deleteQA = useAction(api.admin.deleteQA);
  const isDualLanguage = initialMode === "new" && hideSidebar;

  const [selectedId, setSelectedId] = useState<Id<"qa"> | null>(null);
  const [form, setForm] = useState<FormState>(() => buildEmptyForm(defaultLang));
  const [sharedMeta, setSharedMeta] = useState<SharedMeta>(() => ({
    category: "",
    sectionTitle: "",
    sectionNumber: "",
    questionNumber: "",
    keywords: "",
    sources: [],
  }));
  const [langForms, setLangForms] = useState<Record<LangKey, LangContent>>(() => ({
    vi: { question: "", answerRich: "", answerHtml: "", answerText: "", lang: "vi" },
    en: { question: "", answerRich: "", answerHtml: "", answerText: "", lang: "en" },
  }));
  const [activeLang, setActiveLang] = useState<LangKey>(defaultLang === "en" ? "en" : "vi");
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"qa"> | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(initialMode === "new");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");

  const {
    results: qaResults,
    status: qaStatus,
    loadMore,
  } = usePaginatedQuery(
    api.queries.qa.listPaginated,
    {
      search: search.trim() || undefined,
      lang: langFilter.trim() || undefined,
    },
    { initialNumItems: 15 }
  );

  const qa = qaResults as QADoc[] | undefined;
  const isLoadingList =
    qaResults === undefined || qaStatus === "LoadingFirstPage";
  const canLoadMore = qaStatus === "CanLoadMore";
  const isLoadingMore = qaStatus === "LoadingMore";

  useEffect(() => {
    if (!qa || hideSidebar || initialMode === "new") return;
    if (qa.length === 0) {
      if (!isCreatingNew) {
        setSelectedId(null);
      }
      return;
    }

    const exists = selectedId
      ? qa.some((item) => item._id === selectedId)
      : false;
    if ((!selectedId || !exists) && !isCreatingNew) {
      setSelectedId(qa[0]._id);
    }
  }, [qa, selectedId, isCreatingNew, hideSidebar, initialMode]);

  useEffect(() => {
    if (isDualLanguage) return;
    if (!selectedId || !qa) return;
    const current = qa.find((item) => item._id === selectedId);
    if (!current) return;
    const existingContent = (current.content ?? current.answer ?? "").trim();
    const rawContent = htmlToMarkdown(existingContent);
    const richHtml = richTextToHtml(rawContent);
    const plainText = current.answer ?? richTextToPlainText(rawContent);
    setForm({
      question: current.question ?? "",
      category: current.category ?? "",
      sectionTitle: current.section_title ?? "",
      sectionNumber: current.section_number ?? "",
      questionNumber: current.question_number ?? "",
      lang: current.lang ?? defaultLang,
      keywords: (current.keywords ?? []).join(", "),
      answerRich: rawContent,
      answerHtml: richHtml,
      answerText: plainText,
      sources: normalizeSources(current.sources),
    });
    setIsCreatingNew(false);
  }, [selectedId, qa, defaultLang, isDualLanguage]);

  const resetForm = () => {
    setSelectedId(null);
    setForm(buildEmptyForm(defaultLang));
    setSharedMeta({
      category: "",
      sectionTitle: "",
      sectionNumber: "",
      questionNumber: "",
      keywords: "",
      sources: [],
    });
    setLangForms({
      vi: { question: "", answerRich: "", answerHtml: "", answerText: "", lang: "vi" },
      en: { question: "", answerRich: "", answerHtml: "", answerText: "", lang: "en" },
    });
    setActiveLang(defaultLang === "en" ? "en" : "vi");
    setIsCreatingNew(true);
  };

  const handleSelect = (id: Id<"qa">) => {
    setSelectedId(id);
    setIsCreatingNew(false);
    setIsSidebarOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleAddSource = () => {
    if (isDualLanguage) {
      setSharedMeta((prev) => ({
        ...prev,
        sources: [...prev.sources, createEmptySource()],
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      sources: [...prev.sources, createEmptySource()],
    }));
  };

  const handleRemoveSource = (index: number) => {
    if (isDualLanguage) {
      setSharedMeta((prev) => ({
        ...prev,
        sources: prev.sources.filter((_, idx) => idx !== index),
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      sources: prev.sources.filter((_, idx) => idx !== index),
    }));
  };

  const handleSourceChange = (
    index: number,
    field: keyof SourceEntry,
    value: string,
  ) => {
    if (isDualLanguage) {
      setSharedMeta((prev) => {
        const sources = [...prev.sources];
        sources[index] = { ...sources[index], [field]: value };
        return {
          ...prev,
          sources,
        };
      });
      return;
    }
    setForm((prev) => {
      const sources = [...prev.sources];
      sources[index] = { ...sources[index], [field]: value };
      return {
        ...prev,
        sources,
      };
    });
  };

  const handleSave = async () => {
    if (!isDualLanguage) {
      if (!form.question.trim() || !form.category.trim()) {
        toast({
          title: "Missing required fields",
          description: "Question and category are required.",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);
      try {
        const keywordsArray = form.keywords
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);

        const sourcePayload = buildSourcePayload(form.sources);

        const plainAnswer =
          form.answerText.trim() ||
          richTextToPlainText(form.answerRich);

        if (!plainAnswer) {
          throw new Error("Answer cannot be empty.");
        }

        const richContent = (form.answerHtml || richTextToHtml(form.answerRich)).trim();
        if (!richContent) {
          throw new Error("Answer content cannot be empty.");
        }

        await saveQA({
          id: selectedId ?? undefined,
          question: form.question.trim(),
          answer: plainAnswer,
          content: richContent,
          category: form.category.trim(),
          lang: form.lang.trim() || undefined,
          section_title: form.sectionTitle.trim() || undefined,
          section_number: form.sectionNumber.trim() || undefined,
          question_number: form.questionNumber.trim() || undefined,
          keywords: keywordsArray,
          sources: sourcePayload,
        });

      toast({
        title: "Saved",
        description: "Entry saved and embeddings refreshed.",
      });
      setIsCreatingNew(false);
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message ?? "Unable to save entry.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
      return;
    }

    // Dual-language create flow
    const metaCategory = sharedMeta.category.trim();
    const keywordsArray = sharedMeta.keywords
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const sourcePayload = buildSourcePayload(sharedMeta.sources);

    const langsToSave: LangKey[] = ["vi", "en"].filter((lang) => {
      const entry = langForms[lang];
      return entry.question.trim() && (entry.answerRich.trim() || entry.answerText.trim());
    }) as LangKey[];

    if (!metaCategory || langsToSave.length === 0) {
      toast({
        title: "Missing required fields",
        description: "Category and at least one language version need question and answer content.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        langsToSave.map(async (lang) => {
          const entry = langForms[lang];
          const plainAnswer = entry.answerText.trim() || richTextToPlainText(entry.answerRich);
          if (!plainAnswer) {
            throw new Error(`Answer cannot be empty for ${lang.toUpperCase()}.`);
          }
          const richContent = (entry.answerHtml || richTextToHtml(entry.answerRich)).trim();
          if (!richContent) {
            throw new Error(`Answer content cannot be empty for ${lang.toUpperCase()}.`);
          }

          await saveQA({
            question: entry.question.trim(),
            answer: plainAnswer,
            content: richContent,
            category: metaCategory,
            lang,
            section_title: sharedMeta.sectionTitle.trim() || undefined,
            section_number: sharedMeta.sectionNumber.trim() || undefined,
            question_number: sharedMeta.questionNumber.trim() || undefined,
            keywords: keywordsArray,
            sources: sourcePayload,
          });
        })
      );

      toast({
        title: "Saved",
        description: "Vietnamese and English versions created.",
      });
      resetForm();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message ?? "Unable to save entries.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"qa">) => {
    setDeletingId(id);
    try {
      await deleteQA({ id });
      if (selectedId === id) {
        resetForm();
      }
      toast({
        title: "Deleted",
        description: "Question removed.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message ?? "Unable to delete entry.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const selectedDoc = useMemo(
    () => qa?.find((item) => item._id === selectedId) ?? null,
    [qa, selectedId]
  );

  const shouldShowEditor = hideSidebar || isCreatingNew || Boolean(selectedDoc);

  const currentLangForm = isDualLanguage ? langForms[activeLang] : form;

  const updateCurrentLangForm = (updater: (prev: LangContent) => LangContent) => {
    if (!isDualLanguage) return;
    setLangForms((prev) => ({
      ...prev,
      [activeLang]: updater(prev[activeLang]),
    }));
  };

  return (
    <div className="flex-1 flex border-t bg-background h-full overflow-hidden">
      {!hideSidebar && (
        <>
          {/* Mobile sidebar toggle */}
          <div className="lg:hidden fixed top-20 left-4 z-40">
            <Button
              size="icon"
              variant="outline"
              className="bg-background shadow-lg"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>

          <QuestionsSidebar
            qa={qa}
            isLoadingList={isLoadingList}
            search={search}
            onSearchChange={setSearch}
            langFilter={langFilter}
            onLangFilterChange={setLangFilter}
            selectedId={selectedId}
            onSelect={handleSelect}
            onDelete={handleDelete}
            deletingId={deletingId}
            onReset={resetForm}
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => loadMore(15)}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />

          {/* Mobile sidebar overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </>
      )}

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background relative w-full">
        {shouldShowEditor ? (
          <div className="flex flex-col h-full">
            {/* Sticky Header */}
            <header className="flex items-center justify-between border-b px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold leading-none tracking-tight">
                    {isCreatingNew ? "New Question" : "Edit Question"}
                  </h2>
                  <span className="text-xs text-muted-foreground mt-1 font-mono">
                     {selectedId || "Unsaved Draft"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="sm"
                  className="min-w-[100px]"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-8">
                {/* Top Section: Question & Basic Info */}
                <div className="space-y-6">
                  {isDualLanguage && (
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">Dual language mode</Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "cursor-pointer rounded-full px-3 py-1 border",
                            activeLang === "vi" ? "border-primary text-primary" : "border-transparent hover:border-border"
                          )}
                          onClick={() => setActiveLang("vi")}
                        >
                          Vietnamese
                        </span>
                        <span
                          className={cn(
                            "cursor-pointer rounded-full px-3 py-1 border",
                            activeLang === "en" ? "border-primary text-primary" : "border-transparent hover:border-border"
                          )}
                          onClick={() => setActiveLang("en")}
                        >
                          English
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                      Question
                    </Label>
                    <Textarea
                      value={currentLangForm.question}
                      onChange={(event) =>
                        isDualLanguage
                          ? updateCurrentLangForm((prev) => ({ ...prev, question: event.target.value }))
                          : setForm((prev) => ({
                              ...prev,
                              question: event.target.value,
                            }))
                      }
                      placeholder="e.g. What is the difference between carbon offset and carbon credit?"
                      rows={3}
                      className="text-base h-auto resize-none rounded-lg border border-muted-foreground/20 bg-transparent px-3 py-2 font-medium shadow-sm focus-visible:border-primary"
                    />
                  </div>
                  
                  <div className="grid gap-6 sm:grid-cols-12">
                    <div className="sm:col-span-4 space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                      <Input
                        value={isDualLanguage ? sharedMeta.category : form.category}
                        onChange={(e) =>
                          isDualLanguage
                            ? setSharedMeta((p) => ({ ...p, category: e.target.value }))
                            : setForm((p) => ({ ...p, category: e.target.value }))
                        }
                        placeholder="e.g. Market Mechanisms"
                        className="bg-muted/30"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        Language
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="xs"
                            variant={(isDualLanguage ? activeLang : form.lang) === "vi" ? "secondary" : "outline"}
                            onClick={() =>
                              isDualLanguage
                                ? setActiveLang("vi")
                                : setForm((p) => ({ ...p, lang: "vi" }))
                            }
                          >
                            VI
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant={(isDualLanguage ? activeLang : form.lang) === "en" ? "secondary" : "outline"}
                            onClick={() =>
                              isDualLanguage
                                ? setActiveLang("en")
                                : setForm((p) => ({ ...p, lang: "en" }))
                            }
                          >
                            EN
                          </Button>
                        </div>
                      </Label>
                       <Input
                        value={isDualLanguage ? activeLang : form.lang}
                        onChange={(e) =>
                          isDualLanguage
                            ? setActiveLang((e.target.value as LangKey) || activeLang)
                            : setForm((p) => ({ ...p, lang: e.target.value }))
                        }
                        placeholder="vi or en"
                        className="bg-muted/30"
                      />
                    </div>
                     <div className="sm:col-span-6 space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Keywords</Label>
                       <Input
                        value={isDualLanguage ? sharedMeta.keywords : form.keywords}
                        onChange={(e) =>
                          isDualLanguage
                            ? setSharedMeta((p) => ({ ...p, keywords: e.target.value }))
                            : setForm((p) => ({ ...p, keywords: e.target.value }))
                        }
                        placeholder="comma, separated, tags"
                        className="bg-muted/30"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-border/50" />

                {/* Answer Editor Section */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        Answer
                      </Label>
                      <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as "edit" | "preview")} className="w-auto">
                        <TabsList className="h-8">
                          <TabsTrigger value="edit" className="text-xs h-6 px-3">Edit</TabsTrigger>
                          <TabsTrigger value="preview" className="text-xs h-6 px-3">Preview</TabsTrigger>
                        </TabsList>
                      </Tabs>
                   </div>
                   
                   {editorTab === "edit" ? (
                     <div className="min-h-[400px] rounded-lg border bg-background shadow-sm">
                        <RichTextEditor
                          value={currentLangForm.answerRich}
                          onChange={({ raw, html, text }) =>
                            isDualLanguage
                              ? updateCurrentLangForm((prev) => ({
                                  ...prev,
                                  answerRich: raw,
                                  answerHtml: html,
                                  answerText: text,
                                }))
                              : setForm((prev) => ({
                                  ...prev,
                                  answerRich: raw,
                                  answerHtml: html,
                                  answerText: text,
                                }))
                          }
                          helperText="Supports headings, bold/italic/code, lists, blockquotes, links, and tables."
                        />
                     </div>
                   ) : (
                     <Card className="min-h-[400px] p-6 md:p-8 border shadow-sm bg-card">
                        <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                          {currentLangForm.answerRich ? (
                            <RichTextRenderer content={currentLangForm.answerHtml || richTextToHtml(currentLangForm.answerRich)} />
                          ) : (
                             <p className="text-muted-foreground italic">No content to preview.</p>
                          )}
                        </div>
                     </Card>
                   )}
                </div>

                {/* Advanced Metadata (Collapsible or Bottom) */}
                <div className="space-y-4 pt-4">
                   <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="h-px w-8 bg-border"></span>
                      Additional Metadata
                      <span className="h-px flex-1 bg-border"></span>
                   </p>
                   <div className="grid gap-4 sm:grid-cols-3 opacity-80 hover:opacity-100 transition-opacity">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Section Title</Label>
                        <Input 
                          value={isDualLanguage ? sharedMeta.sectionTitle : form.sectionTitle} 
                          onChange={(e) =>
                            isDualLanguage
                              ? setSharedMeta((p) => ({ ...p, sectionTitle: e.target.value }))
                              : setForm((p) => ({...p, sectionTitle: e.target.value}))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Section No.</Label>
                        <Input 
                          value={isDualLanguage ? sharedMeta.sectionNumber : form.sectionNumber} 
                          onChange={(e) =>
                            isDualLanguage
                              ? setSharedMeta((p) => ({ ...p, sectionNumber: e.target.value }))
                              : setForm((p) => ({...p, sectionNumber: e.target.value}))
                          }
                           className="h-8 text-sm"
                        />
                      </div>
                       <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Question ID</Label>
                        <Input 
                          value={isDualLanguage ? sharedMeta.questionNumber : form.questionNumber} 
                          onChange={(e) =>
                            isDualLanguage
                              ? setSharedMeta((p) => ({ ...p, questionNumber: e.target.value }))
                              : setForm((p) => ({...p, questionNumber: e.target.value}))
                          }
                           className="h-8 text-sm"
                        />
                      </div>
                   </div>
                </div>

                {/* Sources */}
                <div className="space-y-4">
                   <div className="flex items-start justify-between gap-4">
                      <Label className="text-base font-semibold">Sources</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddSource}
                        className="text-xs font-medium"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add source
                      </Button>
                   </div>
                   {(isDualLanguage ? sharedMeta.sources : form.sources).length === 0 ? (
                     <p className="text-xs text-muted-foreground">
                        Add the references or citations that should accompany this answer.
                     </p>
                   ) : (
                     <div className="space-y-3">
                        {(isDualLanguage ? sharedMeta.sources : form.sources).map((source, index) => (
                          <div
                            key={`source-${index}`}
                            className="rounded-2xl border border-border/70 bg-card/50 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Source {index + 1}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveSource(index)}
                                aria-label={`Remove source ${index + 1}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Title or citation</Label>
                              <Input
                                value={source.title}
                                onChange={(event) =>
                                  handleSourceChange(index, "title", event.target.value)
                                }
                                placeholder="Publication title, report, or description"
                                className="bg-muted/30"
                              />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">URL</Label>
                                <Input
                                  value={source.url}
                                  onChange={(event) =>
                                    handleSourceChange(index, "url", event.target.value)
                                  }
                                  placeholder="https://example.com"
                                  className="bg-muted/30"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Type</Label>
                                <Input
                                  value={source.type}
                                  onChange={(event) =>
                                    handleSourceChange(index, "type", event.target.value)
                                  }
                                  placeholder="e.g. Report, Regulation, Article"
                                  className="bg-muted/30"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Location</Label>
                              <Input
                                value={source.location}
                                onChange={(event) =>
                                  handleSourceChange(index, "location", event.target.value)
                                }
                                placeholder="Page, paragraph, section, or organization"
                                className="bg-muted/30"
                              />
                            </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 bg-muted/10">
            <div className="bg-background p-4 rounded-full shadow-sm border">
               <Edit3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="max-w-sm space-y-2">
              <h3 className="text-lg font-semibold">Select a question</h3>
              <p className="text-sm text-muted-foreground">
                Choose a question from the sidebar to edit its content, or create a new one to add to the knowledge base.
              </p>
            </div>
            <Button onClick={resetForm} variant="outline" className="mt-4">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Create New Question
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Tabs defaultValue="questions" className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="border-b bg-muted/20 shrink-0">
        <div className="container mx-auto px-4 sm:px-6 py-3 max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text whitespace-nowrap">
                Admin Dashboard
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Manage questions and view feedback
              </p>
            </div>

            <Authenticated>
              <AdminOnly>
                <TabsList className="hidden md:flex h-9 items-center justify-start rounded-none border-b border-transparent bg-transparent p-0">
                  <TabsTrigger 
                    value="questions" 
                    className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Questions
                  </TabsTrigger>
                  <TabsTrigger 
                    value="create" 
                    className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    New Question
                  </TabsTrigger>
                  <TabsTrigger 
                    value="feedback" 
                    className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Feedback
                  </TabsTrigger>
                </TabsList>
              </AdminOnly>
            </Authenticated>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Tabs (Visible only on small screens) */}
            <Authenticated>
              <AdminOnly>
                 <TabsList className="md:hidden flex h-8 items-center rounded-lg bg-muted p-1">
                    <TabsTrigger value="questions" className="h-6 px-2 text-xs">Q&A</TabsTrigger>
                    <TabsTrigger value="create" className="h-6 px-2 text-xs">New</TabsTrigger>
                    <TabsTrigger value="feedback" className="h-6 px-2 text-xs">Feed</TabsTrigger>
                 </TabsList>
              </AdminOnly>
            </Authenticated>

            <AuthLoading>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading...</span>
              </div>
            </AuthLoading>

            <Unauthenticated>
               <SignInButton mode="modal">
                  <Button size="sm" variant="outline">Sign In</Button>
               </SignInButton>
            </Unauthenticated>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AuthLoading>
          <Card className="m-8 max-w-md mx-auto">
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>Loading authentication...</p>
              </div>
            </CardContent>
          </Card>
        </AuthLoading>

        <Unauthenticated>
          <div className="p-8">
            <Card className="border-amber-200/50 bg-amber-50/30 max-w-md mx-auto">
              <CardContent className="flex flex-col items-center justify-center space-y-6 py-12 sm:py-16">
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">Sign in required</p>
                  <p className="text-sm text-muted-foreground">
                    You need to sign in to access the admin dashboard.
                  </p>
                </div>
                <SignInButton mode="modal">
                  <Button size="lg">Sign In</Button>
                </SignInButton>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Note: Sign-up is disabled. Only the configured admin can sign
                  in.
                </p>
              </CardContent>
            </Card>
          </div>
        </Unauthenticated>

        <Authenticated>
          <AdminOnly
            fallback={
              <div className="container mx-auto px-4 py-8 max-w-md">
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="py-8">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <span className="text-lg">🔒</span>
                      </div>
                      <div>
                        <p className="font-semibold text-destructive">
                          Access Denied
                        </p>
                        <p className="text-sm text-destructive/80 mt-1">
                          You must be an admin to view this page.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            }
          >
             <TabsContent value="questions" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden mt-0">
                 <QuestionsCRM />
              </TabsContent>
              <TabsContent value="create" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden mt-0">
                 <QuestionsCRM initialMode="new" defaultLang="vi" hideSidebar />
              </TabsContent>
              <TabsContent value="feedback" className="flex-1 overflow-auto data-[state=inactive]:hidden mt-0 bg-muted/10">
                <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl">
                   <FeedbackList />
                </div>
              </TabsContent>
          </AdminOnly>
        </Authenticated>
      </div>
    </Tabs>
  );
}
 
