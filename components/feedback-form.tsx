"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Star, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function FeedbackForm() {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, rating, comment, locale }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          setIsOpen(false);
          setIsSubmitted(false);
          setRating(0);
          setName("");
          setEmail("");
          setComment("");
        }, 2000);
      }
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
        className="fixed bottom-6 right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-40 p-0"
        size="icon"
        aria-label={t("trigger")}
      >
        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setIsOpen(false)} aria-label={t("actions.close")}>
              <X className="h-4 w-4" />
            </Button>

            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="bg-primary/10 text-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 fill-current" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{t("success.title")}</h3>
                <p className="text-muted-foreground">{t("success.message")}</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{t("title")}</h3>
                <p className="text-sm text-muted-foreground mb-6">{t("description")}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{t("fields.rating.label")}</label>
                    <div className="flex gap-2">
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
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || rating === 0}>
                    {isSubmitting ? t("actions.submitting") : t("actions.submit")}
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
