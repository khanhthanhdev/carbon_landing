"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Star, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Sub-question rating component
function SubQuestionRating({ 
  question, 
  value, 
  onChange 
}: { 
  question: string; 
  value: number; 
  onChange: (value: number) => void;
}) {
  const [hoveredValue, setHoveredValue] = useState(0);
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-border/30 last:border-0">
      <p className="text-sm text-foreground flex-1">{question}</p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoveredValue(star)}
            onMouseLeave={() => setHoveredValue(0)}
            className="transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm p-0.5"
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
                star <= (hoveredValue || value) ? "fill-primary text-primary" : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-xs font-semibold text-primary min-w-[32px]">
            {value}/5
          </span>
        )}
      </div>
    </div>
  );
}

// Section container component
function EvaluationSection({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-card/30">
      <h4 className="font-semibold text-foreground text-sm">{title}</h4>
      <div className="space-y-0">
        {children}
      </div>
    </div>
  );
}

export function FeedbackForm() {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  
  // Section 1: Nội dung thông tin
  const [contentAccuracy, setContentAccuracy] = useState(0);
  const [contentRelevance, setContentRelevance] = useState(0);
  const [contentFreshness, setContentFreshness] = useState(0);
  
  // Section 2: Dễ sử dụng
  const [interfaceSimplicity, setInterfaceSimplicity] = useState(0);
  const [languageSupport, setLanguageSupport] = useState(0);
  
  // Section 3: Công cụ và tính năng hỗ trợ
  const [toolsAvailability, setToolsAvailability] = useState(0);
  
  // Section 4: Kết nối và chia sẻ
  const [networkingCapability, setNetworkingCapability] = useState(0);
  const [knowledgeSharing, setKnowledgeSharing] = useState(0);
  
  // Section 5: Giá trị và tác động
  const [understandingImprovement, setUnderstandingImprovement] = useState(0);
  const [practicalApplication, setPracticalApplication] = useState(0);
  
  // Section 6: Sự hài lòng chung
  const [overallSatisfaction, setOverallSatisfaction] = useState(0);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const submitFeedback = useMutation(api.feedback.submit);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rating === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitFeedback({ 
        name, 
        email, 
        rating, 
        comment, 
        locale,
        contentAccuracy,
        contentRelevance,
        contentFreshness,
        interfaceSimplicity,
        languageSupport,
        toolsAvailability,
        networkingCapability,
        knowledgeSharing,
        understandingImprovement,
        practicalApplication,
        overallSatisfaction,
      });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setRating(0);
        setContentAccuracy(0);
        setContentRelevance(0);
        setContentFreshness(0);
        setInterfaceSimplicity(0);
        setLanguageSupport(0);
        setToolsAvailability(0);
        setNetworkingCapability(0);
        setKnowledgeSharing(0);
        setUnderstandingImprovement(0);
        setPracticalApplication(0);
        setOverallSatisfaction(0);
        setName("");
        setEmail("");
        setComment("");
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-xl hover:shadow-2xl z-40 p-0 transition-all hover:scale-110 group"
        size="icon"
        aria-label={t("trigger")}
      >
        <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 transition-transform group-hover:scale-110" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-3xl p-6 sm:p-8 lg:p-10 relative max-h-[90vh] overflow-y-auto shadow-2xl border-border/50 animate-in slide-in-from-bottom-4 duration-300">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-3 right-3 sm:top-4 sm:right-4 hover:bg-destructive/10 hover:text-destructive rounded-full" 
              onClick={() => setIsOpen(false)} 
              aria-label={t("actions.close")}
            >
              <X className="h-4 w-4" />
            </Button>

            {isSubmitted ? (
              <div className="text-center py-12 sm:py-16 animate-in zoom-in duration-300">
                <div className="bg-primary/10 text-primary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Star className="h-10 w-10 fill-current" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t("success.title")}</h3>
                <p className="text-base text-muted-foreground">{t("success.message")}</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t("title")}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t("description")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Overall Rating */}
                  <div className="p-5 rounded-xl border-2 border-primary/20 bg-primary/5">
                    <label className="block text-base font-semibold text-foreground mb-4">{t("fields.rating.label")}</label>
                    <div className="flex gap-3 justify-center sm:justify-start">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm p-1"
                          aria-label={t("fields.rating.option", { value: star })}
                        >
                          <Star
                            className={`h-9 w-9 sm:h-10 sm:w-10 transition-colors ${
                              star <= (hoveredRating || rating) ? "fill-primary text-primary" : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className="text-center sm:text-left text-sm text-primary font-medium mt-3">
                        {rating} / 5 ⭐
                      </p>
                    )}
                  </div>

                  {/* Detailed Evaluation Sections */}
                  <div className="space-y-4 border-t-2 border-border/50 pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <h4 className="font-bold text-foreground text-sm sm:text-base">
                        Đánh giá chi tiết / Detailed Evaluation
                      </h4>
                    </div>

                    {/* Section 1: Nội dung thông tin */}
                    <EvaluationSection title={t("fields.section1.title")}>
                      <SubQuestionRating
                        question={t("fields.section1.contentAccuracy")}
                        value={contentAccuracy}
                        onChange={setContentAccuracy}
                      />
                      <SubQuestionRating
                        question={t("fields.section1.contentRelevance")}
                        value={contentRelevance}
                        onChange={setContentRelevance}
                      />
                      <SubQuestionRating
                        question={t("fields.section1.contentFreshness")}
                        value={contentFreshness}
                        onChange={setContentFreshness}
                      />
                    </EvaluationSection>

                    {/* Section 2: Dễ sử dụng */}
                    <EvaluationSection title={t("fields.section2.title")}>
                      <SubQuestionRating
                        question={t("fields.section2.interfaceSimplicity")}
                        value={interfaceSimplicity}
                        onChange={setInterfaceSimplicity}
                      />
                      <SubQuestionRating
                        question={t("fields.section2.languageSupport")}
                        value={languageSupport}
                        onChange={setLanguageSupport}
                      />
                    </EvaluationSection>

                    {/* Section 3: Công cụ và tính năng hỗ trợ */}
                    <EvaluationSection title={t("fields.section3.title")}>
                      <SubQuestionRating
                        question={t("fields.section3.toolsAvailability")}
                        value={toolsAvailability}
                        onChange={setToolsAvailability}
                      />
                    </EvaluationSection>

                    {/* Section 4: Kết nối và chia sẻ */}
                    <EvaluationSection title={t("fields.section4.title")}>
                      <SubQuestionRating
                        question={t("fields.section4.networkingCapability")}
                        value={networkingCapability}
                        onChange={setNetworkingCapability}
                      />
                      <SubQuestionRating
                        question={t("fields.section4.knowledgeSharing")}
                        value={knowledgeSharing}
                        onChange={setKnowledgeSharing}
                      />
                    </EvaluationSection>

                    {/* Section 5: Giá trị và tác động */}
                    <EvaluationSection title={t("fields.section5.title")}>
                      <SubQuestionRating
                        question={t("fields.section5.understandingImprovement")}
                        value={understandingImprovement}
                        onChange={setUnderstandingImprovement}
                      />
                      <SubQuestionRating
                        question={t("fields.section5.practicalApplication")}
                        value={practicalApplication}
                        onChange={setPracticalApplication}
                      />
                    </EvaluationSection>

                    {/* Section 6: Sự hài lòng chung */}
                    <EvaluationSection title={t("fields.section6.title")}>
                      <SubQuestionRating
                        question={t("fields.section6.overallSatisfaction")}
                        value={overallSatisfaction}
                        onChange={setOverallSatisfaction}
                      />
                    </EvaluationSection>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label htmlFor="feedback-name" className="block text-sm font-semibold text-foreground mb-2">
                        {t("fields.name.label")}
                      </label>
                      <Input
                        id="feedback-name"
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        placeholder={t("fields.name.placeholder")}
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label htmlFor="feedback-email" className="block text-sm font-semibold text-foreground mb-2">
                        {t("fields.email.label")}
                      </label>
                      <Input
                        id="feedback-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        placeholder={t("fields.email.placeholder")}
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <label htmlFor="feedback-comment" className="block text-sm font-semibold text-foreground mb-2">
                      {t("fields.comment.label")}
                    </label>
                    <Textarea
                      id="feedback-comment"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      required
                      placeholder={t("fields.comment.placeholder")}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all" 
                      disabled={isSubmitting || rating === 0}
                      size="lg"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {t("actions.submitting")}
                        </span>
                      ) : (
                        t("actions.submit")
                      )}
                    </Button>
                    {rating === 0 && (
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        * Vui lòng đánh giá tổng quan trước khi gửi / Please rate overall before submitting
                      </p>
                    )}
                  </div>
                </form>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
