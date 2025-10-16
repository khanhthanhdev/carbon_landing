"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AIChatDialog } from "@/components/ai-chat-dialog";

export function MainSearchSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("search");

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length > 0) {
      const params = new URLSearchParams();
      params.set("q", trimmedQuery);
      router.push(`/${locale}/search?${params.toString()}`);
    }
  };

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 sm:p-8 lg:p-10 border-2 shadow-lg">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 text-balance">
                {t("title")}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground text-pretty">
                {t("subtitle")}
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("placeholder")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {t("searchButton")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1 h-11 sm:h-12 text-sm sm:text-base bg-transparent"
                  onClick={() => setIsAIDialogOpen(true)}
                >
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {t("askAI")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      <AIChatDialog
        isOpen={isAIDialogOpen}
        onClose={() => setIsAIDialogOpen(false)}
        initialContext={searchQuery || undefined}
      />
    </section>
  );
}
