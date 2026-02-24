"use client";

import { useMutation } from "convex/react";
import { MessageSquare, Star, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";

type FeedbackTranslations = ReturnType<typeof useTranslations>;

type DetailRatingField =
  | "contentAccuracy"
  | "contentRelevance"
  | "contentFreshness"
  | "interfaceSimplicity"
  | "languageSupport"
  | "toolsAvailability"
  | "networkingCapability"
  | "knowledgeSharing"
  | "understandingImprovement"
  | "practicalApplication"
  | "overallSatisfaction";

interface DetailRatings {
  contentAccuracy: number;
  contentFreshness: number;
  contentRelevance: number;
  interfaceSimplicity: number;
  knowledgeSharing: number;
  languageSupport: number;
  networkingCapability: number;
  overallSatisfaction: number;
  practicalApplication: number;
  toolsAvailability: number;
  understandingImprovement: number;
}

interface ContactFields {
  comment: string;
  email: string;
  name: string;
}

const INITIAL_DETAIL_RATINGS: DetailRatings = {
  contentAccuracy: 0,
  contentRelevance: 0,
  contentFreshness: 0,
  interfaceSimplicity: 0,
  languageSupport: 0,
  toolsAvailability: 0,
  networkingCapability: 0,
  knowledgeSharing: 0,
  understandingImprovement: 0,
  practicalApplication: 0,
  overallSatisfaction: 0,
};

const INITIAL_CONTACT_FIELDS: ContactFields = {
  comment: "",
  email: "",
  name: "",
};

const DETAIL_SECTION_CONFIG: Array<{
  items: Array<{ field: DetailRatingField; questionKey: string }>;
  titleKey: string;
}> = [
  {
    titleKey: "fields.section1.title",
    items: [
      {
        field: "contentAccuracy",
        questionKey: "fields.section1.contentAccuracy",
      },
      {
        field: "contentRelevance",
        questionKey: "fields.section1.contentRelevance",
      },
      {
        field: "contentFreshness",
        questionKey: "fields.section1.contentFreshness",
      },
    ],
  },
  {
    titleKey: "fields.section2.title",
    items: [
      {
        field: "interfaceSimplicity",
        questionKey: "fields.section2.interfaceSimplicity",
      },
      {
        field: "languageSupport",
        questionKey: "fields.section2.languageSupport",
      },
    ],
  },
  {
    titleKey: "fields.section3.title",
    items: [
      {
        field: "toolsAvailability",
        questionKey: "fields.section3.toolsAvailability",
      },
    ],
  },
  {
    titleKey: "fields.section4.title",
    items: [
      {
        field: "networkingCapability",
        questionKey: "fields.section4.networkingCapability",
      },
      {
        field: "knowledgeSharing",
        questionKey: "fields.section4.knowledgeSharing",
      },
    ],
  },
  {
    titleKey: "fields.section5.title",
    items: [
      {
        field: "understandingImprovement",
        questionKey: "fields.section5.understandingImprovement",
      },
      {
        field: "practicalApplication",
        questionKey: "fields.section5.practicalApplication",
      },
    ],
  },
  {
    titleKey: "fields.section6.title",
    items: [
      {
        field: "overallSatisfaction",
        questionKey: "fields.section6.overallSatisfaction",
      },
    ],
  },
];

function SubQuestionRating({
  question,
  value,
  onChange,
}: {
  question: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [hoveredValue, setHoveredValue] = useState(0);

  return (
    <div className="flex flex-col gap-3 border-border/30 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex-1 text-foreground text-sm">{question}</p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            aria-label={`Rate ${star} out of 5`}
            className="rounded-sm p-0.5 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoveredValue(star)}
            onMouseLeave={() => setHoveredValue(0)}
            type="button"
          >
            <Star
              className={`h-5 w-5 transition-colors sm:h-6 sm:w-6 ${
                star <= (hoveredValue || value)
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 min-w-[32px] font-semibold text-primary text-xs">
            {value}/5
          </span>
        )}
      </div>
    </div>
  );
}

function EvaluationSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-card/30 p-4">
      <h4 className="font-semibold text-foreground text-sm">{title}</h4>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

interface OverallRatingSectionProps {
  hoveredRating: number;
  label: string;
  onHover: (value: number) => void;
  onRate: (value: number) => void;
  optionLabel: (value: number) => string;
  rating: number;
}

function OverallRatingSection({
  label,
  optionLabel,
  rating,
  hoveredRating,
  onHover,
  onRate,
}: OverallRatingSectionProps) {
  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
      <label className="mb-4 block font-semibold text-base text-foreground">
        {label}
      </label>
      <div className="flex justify-center gap-3 sm:justify-start">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            aria-label={optionLabel(star)}
            className="rounded-sm p-1 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
            key={star}
            onClick={() => onRate(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={() => onHover(0)}
            type="button"
          >
            <Star
              className={`h-9 w-9 transition-colors sm:h-10 sm:w-10 ${
                star <= (hoveredRating || rating)
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <p className="mt-3 text-center font-medium text-primary text-sm sm:text-left">
          {rating} / 5 ⭐
        </p>
      )}
    </div>
  );
}

interface DetailedEvaluationProps {
  onChange: (field: DetailRatingField, value: number) => void;
  ratings: DetailRatings;
  t: FeedbackTranslations;
}

function DetailedEvaluation({ ratings, t, onChange }: DetailedEvaluationProps) {
  return (
    <div className="space-y-4 border-border/50 border-t-2 pt-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h4 className="font-bold text-foreground text-sm sm:text-base">
          Đánh giá chi tiết / Detailed Evaluation
        </h4>
      </div>

      {DETAIL_SECTION_CONFIG.map((section) => (
        <EvaluationSection key={section.titleKey} title={t(section.titleKey)}>
          {section.items.map((item) => (
            <SubQuestionRating
              key={item.field}
              onChange={(value) => onChange(item.field, value)}
              question={t(item.questionKey)}
              value={ratings[item.field]}
            />
          ))}
        </EvaluationSection>
      ))}
    </div>
  );
}

interface ContactInformationProps {
  fields: ContactFields;
  onChange: (field: keyof ContactFields, value: string) => void;
  t: FeedbackTranslations;
}

function ContactInformation({ fields, t, onChange }: ContactInformationProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <div>
          <label
            className="mb-2 block font-semibold text-foreground text-sm"
            htmlFor="feedback-name"
          >
            {t("fields.name.label")}
          </label>
          <Input
            className="h-11"
            id="feedback-name"
            onChange={(event) => onChange("name", event.target.value)}
            placeholder={t("fields.name.placeholder")}
            required
            type="text"
            value={fields.name}
          />
        </div>

        <div>
          <label
            className="mb-2 block font-semibold text-foreground text-sm"
            htmlFor="feedback-email"
          >
            {t("fields.email.label")}
          </label>
          <Input
            className="h-11"
            id="feedback-email"
            onChange={(event) => onChange("email", event.target.value)}
            placeholder={t("fields.email.placeholder")}
            required
            type="email"
            value={fields.email}
          />
        </div>
      </div>

      <div>
        <label
          className="mb-2 block font-semibold text-foreground text-sm"
          htmlFor="feedback-comment"
        >
          {t("fields.comment.label")}
        </label>
        <Textarea
          className="resize-none"
          id="feedback-comment"
          onChange={(event) => onChange("comment", event.target.value)}
          placeholder={t("fields.comment.placeholder")}
          required
          rows={4}
          value={fields.comment}
        />
      </div>
    </>
  );
}

interface FeedbackModalFormProps {
  fields: ContactFields;
  hoveredRating: number;
  isSubmitting: boolean;
  onContactChange: (field: keyof ContactFields, value: string) => void;
  onHover: (value: number) => void;
  onRate: (value: number) => void;
  onRatingChange: (field: DetailRatingField, value: number) => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  rating: number;
  ratings: DetailRatings;
  t: FeedbackTranslations;
}

function FeedbackModalForm({
  fields,
  hoveredRating,
  isSubmitting,
  rating,
  ratings,
  t,
  onContactChange,
  onHover,
  onRate,
  onRatingChange,
  onSubmit,
}: FeedbackModalFormProps) {
  return (
    <form className="space-y-8" onSubmit={onSubmit}>
      <OverallRatingSection
        hoveredRating={hoveredRating}
        label={t("fields.rating.label")}
        onHover={onHover}
        onRate={onRate}
        optionLabel={(value) => t("fields.rating.option", { value })}
        rating={rating}
      />

      <DetailedEvaluation onChange={onRatingChange} ratings={ratings} t={t} />

      <ContactInformation fields={fields} onChange={onContactChange} t={t} />

      <div className="pt-4">
        <Button
          className="h-12 w-full font-semibold text-base shadow-lg transition-all hover:shadow-xl"
          disabled={isSubmitting || rating === 0}
          size="lg"
          type="submit"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("actions.submitting")}
            </span>
          ) : (
            t("actions.submit")
          )}
        </Button>
        {rating === 0 && (
          <p className="mt-3 text-center text-muted-foreground text-xs">
            * Vui lòng đánh giá tổng quan trước khi gửi / Please rate overall
            before submitting
          </p>
        )}
      </div>
    </form>
  );
}

export function FeedbackForm() {
  const t = useTranslations("feedback");
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [ratings, setRatings] = useState<DetailRatings>(INITIAL_DETAIL_RATINGS);
  const [fields, setFields] = useState<ContactFields>(INITIAL_CONTACT_FIELDS);

  const submitFeedback = useMutation(api.feedback.submit);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rating === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitFeedback({
        name: fields.name,
        email: fields.email,
        rating,
        comment: fields.comment,
        locale,
        ...ratings,
      });

      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setRating(0);
        setHoveredRating(0);
        setRatings(INITIAL_DETAIL_RATINGS);
        setFields(INITIAL_CONTACT_FIELDS);
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingChange = (field: DetailRatingField, value: number) => {
    setRatings((prev) =>
      prev[field] === value ? prev : { ...prev, [field]: value }
    );
  };

  const handleContactChange = (field: keyof ContactFields, value: string) => {
    setFields((prev) =>
      prev[field] === value ? prev : { ...prev, [field]: value }
    );
  };

  return (
    <>
      <Button
        aria-label={t("trigger")}
        className="group fixed right-6 bottom-6 z-40 h-14 w-14 rounded-full p-0 shadow-xl transition-all hover:scale-110 hover:shadow-2xl sm:h-16 sm:w-16"
        onClick={() => setIsOpen(true)}
        size="icon"
      >
        <MessageSquare className="h-6 w-6 transition-transform group-hover:scale-110 sm:h-7 sm:w-7" />
      </Button>

      {isOpen && (
        <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
          <Card className="slide-in-from-bottom-4 relative max-h-[90vh] w-full max-w-3xl animate-in overflow-y-auto border-border/50 p-6 shadow-2xl duration-300 sm:p-8 lg:p-10">
            <Button
              aria-label={t("actions.close")}
              className="absolute top-3 right-3 rounded-full hover:bg-destructive/10 hover:text-destructive sm:top-4 sm:right-4"
              onClick={() => setIsOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>

            {isSubmitted ? (
              <div className="zoom-in animate-in py-12 text-center duration-300 sm:py-16">
                <div className="mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Star className="h-10 w-10 fill-current" />
                </div>
                <h3 className="mb-3 font-bold text-2xl text-foreground sm:text-3xl">
                  {t("success.title")}
                </h3>
                <p className="text-base text-muted-foreground">
                  {t("success.message")}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="mb-3 font-bold text-2xl text-foreground sm:text-3xl">
                    {t("title")}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                    {t("description")}
                  </p>
                </div>

                <FeedbackModalForm
                  fields={fields}
                  hoveredRating={hoveredRating}
                  isSubmitting={isSubmitting}
                  onContactChange={handleContactChange}
                  onHover={setHoveredRating}
                  onRate={setRating}
                  onRatingChange={handleRatingChange}
                  onSubmit={handleSubmit}
                  rating={rating}
                  ratings={ratings}
                  t={t}
                />
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
