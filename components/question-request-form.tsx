"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, User, HelpCircle, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuestionRequestFormProps {
  searchQuery: string;
}

export function QuestionRequestForm({ searchQuery }: QuestionRequestFormProps) {
  const t = useTranslations("questionRequest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState(searchQuery);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitQuestionRequest = useMutation(api.questionRequests.create);

  // Keep the question field in sync when the search query changes
  useEffect(() => {
    setQuestion((previous) => (previous.trim().length === 0 ? searchQuery : previous));
  }, [searchQuery]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitQuestionRequest({
        name: name.trim(),
        email: email.trim(),
        question: question.trim(),
        sourceQuery: searchQuery.trim() ? searchQuery.trim() : undefined,
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting question request:", err);
      setError(err instanceof Error ? err.message : "Failed to submit question request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="p-4 sm:p-6 md:p-8 lg:p-10 border-2 text-center">
        <div className="bg-primary/10 text-primary rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <Mail className="h-6 w-6 sm:h-8 sm:w-8" />
        </div>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 sm:mb-3">{t("success.title")}</h3>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-3 sm:mb-4 px-2">
          {t("success.description", { email })}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          {t("success.cta")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 md:p-8 lg:p-10 border-2">
      <div className="text-center mb-4 sm:mb-6">
        <div className="bg-muted rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2">{t("title")}</h3>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <label htmlFor="request-name" className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
            {t("fields.name.label")}
          </label>
          <Input
            id="request-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder={t("fields.name.placeholder")}
            className="h-10 sm:h-11 md:h-12 text-sm sm:text-base"
          />
        </div>

        <div>
          <label htmlFor="request-email" className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">
            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
            {t("fields.email.label")}
          </label>
          <Input
            id="request-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder={t("fields.email.placeholder")}
            className="h-10 sm:h-11 md:h-12 text-sm sm:text-base"
          />
        </div>

        <div>
          <label htmlFor="request-question" className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">
            <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
            {t("fields.question.label")}
          </label>
          <Textarea
            id="request-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            required
            placeholder={t("fields.question.placeholder")}
            rows={4}
            className="text-sm sm:text-base resize-none"
          />
        </div>

        <Button type="submit" className="w-full h-10 sm:h-11 md:h-12 text-sm sm:text-base" disabled={isSubmitting}>
          {isSubmitting ? t("actions.submitting") : t("actions.submit")}
        </Button>
      </form>
    </Card>
  );
}
