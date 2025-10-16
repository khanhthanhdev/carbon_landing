"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function FeedbackSection() {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
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
      await submitFeedback({ name, email, rating, comment, locale });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setRating(0);
        setName("");
        setEmail("");
        setComment("");
      }, 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-muted/30" id="feedback">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-4 sm:mb-6">
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm font-medium">{t("trigger")}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance px-2">
            {t("title")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty px-2">
            {t("description")}
          </p>
        </div>

        <Card className="max-w-2xl mx-auto p-6 sm:p-8 lg:p-12">
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="bg-primary/10 text-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 fill-current" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{t("success.title")}</h3>
              <p className="text-muted-foreground">{t("success.message")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">{t("fields.rating.label")}</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                      aria-label={t("fields.rating.option", { value: star })}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= (hoveredRating || rating) ? "fill-primary text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="feedback-name" className="block text-sm font-medium text-foreground mb-2">
                    {t("fields.name.label")}
                  </label>
                  <Input
                    id="feedback-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder={t("fields.name.placeholder")}
                  />
                </div>

                <div>
                  <label htmlFor="feedback-email" className="block text-sm font-medium text-foreground mb-2">
                    {t("fields.email.label")}
                  </label>
                  <Input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder={t("fields.email.placeholder")}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="feedback-comment" className="block text-sm font-medium text-foreground mb-2">
                  {t("fields.comment.label")}
                </label>
                <Textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  required
                  placeholder={t("fields.comment.placeholder")}
                  rows={5}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || rating === 0} size="lg">
                {isSubmitting ? t("actions.submitting") : t("actions.submit")}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </section>
  );
}
