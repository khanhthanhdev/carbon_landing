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
    <section className="pt-16 sm:pt-0 py-8 sm:py-12 lg:py-16 xl:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-4 sm:p-6 lg:p-8 xl:p-10 border-2 shadow-lg">
            <div className="text-center mb-4 sm:mb-6 lg:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-2 sm:mb-3 lg:mb-4 text-balance">
                {t("title")}
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground text-pretty">
                {t("subtitle")}
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("placeholder")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10 sm:pl-12 h-10 sm:h-12 lg:h-14 text-sm sm:text-base"
                />
              </div>

              <div className="flex flex-col gap-2 sm:gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-10 sm:h-11 lg:h-12 text-sm sm:text-base"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {t("searchButton")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-10 sm:h-11 lg:h-12 text-sm sm:text-base bg-transparent"
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
