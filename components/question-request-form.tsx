"use client";

import { useMutation } from "convex/react";
import { AlertCircle, HelpCircle, Mail, User } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";

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
    setQuestion((previous) =>
      previous.trim().length === 0 ? searchQuery : previous
    );
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
      setError(
        err instanceof Error ? err.message : "Failed to submit question request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-2 p-4 text-center sm:p-6 md:p-8 lg:p-10">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:mb-4 sm:h-16 sm:w-16">
          <Mail className="h-6 w-6 sm:h-8 sm:w-8" />
        </div>
        <h3 className="mb-2 font-bold text-foreground text-lg sm:mb-3 sm:text-xl md:text-2xl">
          {t("success.title")}
        </h3>
        <p className="mb-3 px-2 text-muted-foreground text-xs sm:mb-4 sm:text-sm md:text-base">
          {t("success.description", { email })}
        </p>
        <Button
          onClick={() => window.location.reload()}
          size="sm"
          variant="outline"
        >
          {t("success.cta")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-2 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mb-4 text-center sm:mb-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted sm:mb-4 sm:h-16 sm:w-16">
          <HelpCircle className="h-6 w-6 text-muted-foreground sm:h-8 sm:w-8" />
        </div>
        <h3 className="mb-2 font-bold text-foreground text-lg sm:text-xl md:text-2xl">
          {t("title")}
        </h3>
        <p className="px-2 text-muted-foreground text-xs sm:text-sm md:text-base">
          {t("subtitle")}
        </p>
      </div>

      <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <label
            className="mb-1.5 block font-medium text-foreground text-xs sm:mb-2 sm:text-sm"
            htmlFor="request-name"
          >
            <User className="mr-1 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("fields.name.label")}
          </label>
          <Input
            className="h-10 text-sm sm:h-11 sm:text-base md:h-12"
            id="request-name"
            onChange={(event) => setName(event.target.value)}
            placeholder={t("fields.name.placeholder")}
            required
            type="text"
            value={name}
          />
        </div>

        <div>
          <label
            className="mb-1.5 block font-medium text-foreground text-xs sm:mb-2 sm:text-sm"
            htmlFor="request-email"
          >
            <Mail className="mr-1 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("fields.email.label")}
          </label>
          <Input
            className="h-10 text-sm sm:h-11 sm:text-base md:h-12"
            id="request-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("fields.email.placeholder")}
            required
            type="email"
            value={email}
          />
        </div>

        <div>
          <label
            className="mb-1.5 block font-medium text-foreground text-xs sm:mb-2 sm:text-sm"
            htmlFor="request-question"
          >
            <HelpCircle className="mr-1 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("fields.question.label")}
          </label>
          <Textarea
            className="resize-none text-sm sm:text-base"
            id="request-question"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t("fields.question.placeholder")}
            required
            rows={4}
            value={question}
          />
        </div>

        <Button
          className="h-10 w-full text-sm sm:h-11 sm:text-base md:h-12"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t("actions.submitting") : t("actions.submit")}
        </Button>
      </form>
    </Card>
  );
}
