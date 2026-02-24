"use client";

import { MessageSquare, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type React from "react";
import { memo, useState } from "react";
import { AIChatDialog } from "@/components/ai-chat-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const MainSearchSection = memo(function MainSearchSection() {
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
    <section className="bg-gradient-to-b from-background to-muted/30 py-8 pt-16 sm:py-12 sm:pt-0 lg:py-16 xl:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-2 p-4 shadow-lg sm:p-6 lg:p-8 xl:p-10">
            <div className="mb-4 text-center sm:mb-6 lg:mb-8">
              <h2 className="mb-2 text-balance font-bold text-foreground text-xl sm:mb-3 sm:text-2xl lg:mb-4 lg:text-3xl xl:text-4xl">
                {t("title")}
              </h2>
              <p className="text-pretty text-muted-foreground text-sm sm:text-base lg:text-lg">
                {t("subtitle")}
              </p>
            </div>

            <form className="space-y-3 sm:space-y-4" onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
                <Input
                  className="h-10 pl-10 text-sm sm:h-12 sm:pl-12 sm:text-base lg:h-14"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("placeholder")}
                  type="text"
                  value={searchQuery}
                />
              </div>

              <div className="flex flex-col gap-2 sm:gap-3">
                <Button
                  className="h-10 w-full text-sm sm:h-11 sm:text-base lg:h-12"
                  size="lg"
                  type="submit"
                >
                  <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {t("searchButton")}
                </Button>
                <Button
                  className="h-10 w-full bg-transparent text-sm sm:h-11 sm:text-base lg:h-12"
                  onClick={() => setIsAIDialogOpen(true)}
                  size="lg"
                  type="button"
                  variant="outline"
                >
                  <MessageSquare className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {t("askAI")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      <AIChatDialog
        initialContext={searchQuery || undefined}
        isOpen={isAIDialogOpen}
        onClose={() => setIsAIDialogOpen(false)}
      />
    </section>
  );
});
