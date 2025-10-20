"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { RefreshCw, Search, Bot, Sparkles, ArrowRight } from "lucide-react";

export function FutureSection() {
  const t = useTranslations("futureSection");

  const features = [
    {
      icon: RefreshCw,
      title: t("continuousUpdates.title"),
      description: t("continuousUpdates.description"),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/books",
      buttonText: t("continuousUpdates.buttonText"),
    },
    {
      icon: Search,
      title: t("semanticSearch.title"),
      description: t("semanticSearch.description"),
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/search",
      buttonText: t("semanticSearch.buttonText"),
    },
    {
      icon: Bot,
      title: t("aiAssistant.title"),
      description: t("aiAssistant.description"),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/ask-ai",
      buttonText: t("aiAssistant.buttonText"),
    },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-small-black/[0.02] -z-10" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wide">{t("badge")}</span>
          </div>
          {/* <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 text-balance leading-tight">
            {t("title")}
          </h2> */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-6 sm:p-8 lg:p-10 border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col h-full"
              >
                <div className="flex-1 space-y-6">
                  {/* <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${feature.color}`} />
                  </div> */}

                  <div className="space-y-3">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Link href={feature.href} className="block">
                    <Button
                      className="w-full group-hover:bg-primary/90 transition-colors"
                      size="lg"
                    >
                      {feature.buttonText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}