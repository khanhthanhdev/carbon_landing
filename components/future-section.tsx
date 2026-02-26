"use client";

import { ArrowRight, Bot, RefreshCw, Search } from "lucide-react";
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
      href: "/books",
      buttonText: t("continuousUpdates.buttonText"),
    },
    {
      icon: Search,
      title: t("semanticSearch.title"),
      description: t("semanticSearch.description"),
      href: "/search",
      buttonText: t("semanticSearch.buttonText"),
    },
    {
      icon: Bot,
      title: t("aiAssistant.title"),
      description: t("aiAssistant.description"),
      href: "/ask-ai",
      buttonText: t("aiAssistant.buttonText"),
    },
  ];

  return (
    <section className="bg-background py-16 sm:py-20 lg:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16 lg:mb-20">
          {/* Left-border section label */}
          <div className="mb-6 flex justify-center">
            <div className="border-primary border-l-4 pl-3 text-left">
              <span className="font-semibold text-primary text-sm uppercase tracking-widest">
                {t("badge")}
              </span>
            </div>
          </div>
          <p className="mx-auto max-w-3xl text-pretty text-lg text-muted-foreground leading-relaxed sm:text-xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                className="group flex h-full flex-col rounded-sm border border-border/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg sm:p-8"
                key={feature.href}
              >
                {/* Top accent bar */}
                <div className="mb-6 h-0.5 w-12 bg-primary transition-all duration-300 group-hover:w-20" />

                <div className="flex-1 space-y-6">
                  {/* Icon */}
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-foreground text-xl transition-colors group-hover:text-primary sm:text-2xl">
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
                      className="w-full rounded-sm bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
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
