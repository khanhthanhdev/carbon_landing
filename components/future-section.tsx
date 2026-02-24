"use client";

import { ArrowRight, Bot, RefreshCw, Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/navigation";

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
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-16 sm:py-20 lg:py-28">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-grid-small-black/[0.02]" />
      <div className="absolute top-1/2 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 blur-3xl" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16 lg:mb-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium text-sm uppercase tracking-wide">
              {t("badge")}
            </span>
          </div>
          {/* <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 text-balance leading-tight">
            {t("title")}
          </h2> */}
          <p className="mx-auto max-w-3xl text-pretty text-lg text-muted-foreground leading-relaxed sm:text-xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                className="group flex h-full flex-col border-2 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8 lg:p-10"
                key={feature.href}
              >
                <div className="flex-1 space-y-6">
                  {/* <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${feature.color}`} />
                  </div> */}

                  <div className="space-y-3">
                    <h3 className="font-bold text-foreground text-xl transition-colors group-hover:text-primary sm:text-2xl lg:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed sm:text-lg">
                      {feature.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Link className="block" href={feature.href}>
                    <Button
                      className="w-full transition-colors group-hover:bg-primary/90"
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
