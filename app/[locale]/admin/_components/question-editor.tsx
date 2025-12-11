"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { RichTextEditor } from "@/components/rich-text-editor";
import { htmlToMarkdown, richTextToHtml, richTextToPlainText } from "@/lib/rich-text";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Save } from "lucide-react";

type SourceEntry = {
  type: string;
  title: string;
  url: string;
  location: string;
};

type FormState = {
  question: string;
  category: string;
  sectionId: string;
  lang: string;
  keywords: string;
  answerRich: string;
  sources: SourceEntry[];
};

const initialFormState: FormState = {
  question: "",
  category: "",
  sectionId: "",
  lang: "vi",
  keywords: "",
  answerRich: "",
  sources: [],
};

interface QuestionEditorProps {
    qaId?: string; // "new" or ID
}

export function QuestionEditor({ qaId }: QuestionEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isNew = !qaId || qaId === "new";
  
  // Data Fetching
  const qaDoc = useQuery(api.qa.get, isNew ? "skip" : { id: qaId as Id<"qa"> });
  const saveQA = useAction(api.admin.saveQAWithEmbeddings);
  const sectionsList = useQuery(api.sections.list, {}) ?? [];
  const sectionsMap = new Map(sectionsList.map(s => [s._id, s]));

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(isNew);

  useEffect(() => {
      if (!isNew && qaDoc) {
          const rawContent = htmlToMarkdown(qaDoc.answer ?? "");
          
          setFormData({
              question: qaDoc.question ?? "",
              category: qaDoc.category ?? "",
              sectionId: qaDoc.section_number ? sectionsList.find(s => s.order.toString() === qaDoc.section_number)?. _id ?? "" : "",
              lang: (qaDoc as any).lang ?? "vi",
              keywords: (qaDoc.keywords ?? []).join(", "),
              answerRich: rawContent,
              sources: (qaDoc.sources as SourceEntry[]) || [],
          });
          setIsLoaded(true);
      } else if (!isNew && qaDoc === null) {
          // specific loading state or not found
      }
  }, [qaDoc, isNew, sectionsList]);

  const cleanSources = (sources: SourceEntry[]) => {
      return sources.map(s => ({
          type: s.type?.trim() || "",
          title: s.title?.trim() || s.url?.trim() || "",
          url: s.url?.trim() || "",
          location: s.location?.trim() || ""
      })).filter(s => s.title || s.url);
  };

  const handleSave = async () => {
    if (!formData.question || !formData.category) {
      toast({ title: "Missing required fields", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const selectedSection = formData.sectionId ? sectionsMap.get(formData.sectionId as any) : null;
      const plainAnswer = richTextToPlainText(formData.answerRich);
      const richContent = richTextToHtml(formData.answerRich);

      if (!plainAnswer.trim()) {
           toast({ title: "Answer is required", variant: "destructive" });
           setIsSaving(false);
           return;
      }

      await saveQA({
        id: (!isNew ? qaId : undefined) as Id<"qa"> | undefined,
        question: formData.question,
        answer: plainAnswer,
        content: richContent,
        category: formData.category,
        lang: formData.lang,
        section_id: formData.sectionId || undefined,
        section_title: selectedSection?.name_vi || undefined,
        section_number: selectedSection ? selectedSection.order.toString() : undefined,
        keywords: formData.keywords.split(",").map(k => k.trim()).filter(Boolean),
        sources: cleanSources(formData.sources),
      });

      toast({ title: isNew ? "Question created" : "Question updated" });
      router.push("/admin/questions");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded && !isNew) {
      return (
        <div className="flex h-full items-center justify-center p-8">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.back()}>
                  <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{isNew ? "New Question" : "Edit Question"}</h1>
                <p className="text-sm text-muted-foreground">
                    {isNew ? "Add a new Q&A pair to the database." : "Update existing Q&A content."}
                </p>
              </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="lg">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
          </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Main Content */}
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Content</CardTitle>
                    <CardDescription>The core question and answer content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-base">Question <span className="text-red-500">*</span></Label>
                        <Textarea 
                            value={formData.question} 
                            onChange={(e) => setFormData(p => ({ ...p, question: e.target.value }))}
                            placeholder="Enter the question here..."
                            className="text-lg font-medium min-h-[100px] resize-y"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-base">Answer <span className="text-red-500">*</span></Label>
                        <div className="border rounded-md min-h-[400px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                            <RichTextEditor 
                                value={formData.answerRich} 
                                onChange={({ raw }) => setFormData(p => ({ ...p, answerRich: raw }))} 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Classification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Section</Label>
                        <Select 
                            value={formData.sectionId} 
                            onValueChange={(val) => setFormData(p => ({ ...p, sectionId: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Section" />
                            </SelectTrigger>
                            <SelectContent>
                                {sectionsList.map(s => (
                                    <SelectItem key={s._id} value={s._id}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground w-4">{s.order}.</span>
                                            {s.name_vi}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Category <span className="text-red-500">*</span></Label>
                        <Input 
                            value={formData.category} 
                            onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                            placeholder="e.g. Overview"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Language</Label>
                        <Select 
                            value={formData.lang} 
                            onValueChange={(val) => setFormData(p => ({ ...p, lang: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vi">Vietnamese 🇻🇳</SelectItem>
                                <SelectItem value="en">English 🇺🇸</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label>Keywords</Label>
                        <Input 
                            value={formData.keywords} 
                            onChange={(e) => setFormData(p => ({ ...p, keywords: e.target.value }))}
                            placeholder="Comma separated tags..."
                        />
                        <p className="text-xs text-muted-foreground">Used for search indexing.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
