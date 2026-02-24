"use client";

import {
  Award,
  ExternalLink,
  Globe,
  Leaf,
  MessageSquare,
  Recycle,
  TrendingDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const bookPages = [
  {
    icon: TrendingDown,
    color: "text-primary",
    bgColor: "bg-primary/10",
    key: "carbonTrading",
    sources: [
      {
        title: "UNFCCC Carbon Trading Guide",
        url: "https://unfccc.int/process/the-kyoto-protocol/mechanisms",
      },
      {
        title: "EU Emissions Trading System",
        url: "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en",
      },
      {
        title: "World Bank Carbon Pricing",
        url: "https://www.worldbank.org/en/programs/pricing-carbon",
      },
      { title: "Carbon Market Watch", url: "https://carbonmarketwatch.org/" },
    ],
  },
  {
    icon: Recycle,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    key: "whySMEs",
    sources: [
      { title: "SME Climate Hub", url: "https://smeclimatehub.org/" },
      {
        title: "Business Carbon Calculator",
        url: "https://www.carbontrust.com/our-services/footprinting",
      },
      {
        title: "Green Business Guide",
        url: "https://www.greenbusinessbureau.com/",
      },
    ],
  },
  {
    icon: Globe,
    color: "text-accent",
    bgColor: "bg-accent/10",
    key: "businessImpact",
    sources: [
      { title: "Carbon Credit Markets", url: "https://www.goldstandard.org/" },
      {
        title: "Business Impact Assessment",
        url: "https://sciencebasedtargets.org/",
      },
      { title: "Sustainability ROI Calculator", url: "https://www.cdp.net/" },
      {
        title: "Green Finance Institute",
        url: "https://www.greenfinanceinstitute.co.uk/",
      },
    ],
  },
  {
    icon: Award,
    color: "text-primary",
    bgColor: "bg-primary/10",
    key: "trainingScope",
    sources: [
      { title: "GHG Protocol Standards", url: "https://ghgprotocol.org/" },
      { title: "Carbon Literacy Training", url: "https://carbonliteracy.com/" },
      {
        title: "ISO 14064 Guidelines",
        url: "https://www.iso.org/standard/66453.html",
      },
    ],
  },
  {
    icon: Leaf,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    key: "callToAction",
    sources: [
      {
        title: "Net Zero Business Guide",
        url: "https://www.un.org/en/climatechange/net-zero-coalition",
      },
      { title: "Sustainable Business Network", url: "https://www.wbcsd.org/" },
      { title: "Climate Action Resources", url: "https://www.wri.org/" },
      { title: "Green Growth Platform", url: "https://www.gggi.org/" },
    ],
  },
] as const;

export function BookFlipSection() {
  const t = useTranslations("bookFlip");
  const [visiblePages, setVisiblePages] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number.parseInt(
              entry.target.getAttribute("data-index") || "0",
              10
            );
            setVisiblePages((prev) =>
              prev.includes(index) ? prev : [...prev, index]
            );
          }
        });
      },
      { threshold: 0.3 }
    );

    const pages = sectionRef.current?.querySelectorAll(".book-page");
    pages?.forEach((page) => observer.observe(page));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-muted/30 py-20 lg:py-32" id="about" ref={sectionRef}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-balance font-bold text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="mx-auto max-w-6xl space-y-32">
          {bookPages.map((page, index) => {
            const Icon = page.icon;
            const isVisible = visiblePages.includes(index);
            const isEven = index % 2 === 0;

            return (
              <div
                className="book-page relative"
                data-index={index}
                key={page.key}
              >
                <div
                  className={`grid items-start gap-8 lg:grid-cols-2 lg:gap-16 ${isEven ? "" : "lg:grid-flow-dense"}`}
                >
                  <div
                    className={`${isEven ? "" : "lg:col-start-2"} ${isVisible ? "animate-fade-in-up" : "opacity-0"} relative`}
                    style={{ animationDelay: "0.2s" }}
                  >
                    <div className="space-y-4">
                      <h4 className="mb-4 flex items-center gap-2 font-semibold text-muted-foreground text-sm">
                        <ExternalLink className="h-4 w-4" />
                        {t("resourcesTitle")}
                      </h4>
                      {page.sources.map((source) => (
                        <a
                          className="group block"
                          href={source.url}
                          key={source.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <Card className="relative overflow-hidden p-4 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-md">
                            <div
                              className={`absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b ${
                                isEven
                                  ? "from-primary/50 to-primary"
                                  : "from-secondary/50 to-secondary"
                              } opacity-0 transition-opacity group-hover:opacity-100`}
                            />
                            <div className="flex items-start justify-between gap-3 pl-2">
                              <div className="flex-1">
                                <p className="font-medium text-foreground text-sm leading-relaxed transition-colors group-hover:text-primary">
                                  {source.title}
                                </p>
                                <p className="mt-1 truncate text-muted-foreground text-xs">
                                  {new URL(source.url).hostname}
                                </p>
                              </div>
                              <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                            </div>
                          </Card>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`${isEven ? "" : "lg:col-start-1 lg:row-start-1"} ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
                    style={{ animationDelay: "0.4s" }}
                  >
                    <Card className="relative border-2 p-8 shadow-lg transition-shadow hover:shadow-xl">
                      <div
                        className={`absolute ${isEven ? "top-1/2 right-0" : "top-1/2 left-0"} h-0.5 w-8 bg-gradient-to-r ${
                          isEven
                            ? "from-primary/30 to-transparent"
                            : "from-transparent to-primary/30"
                        } hidden -translate-y-1/2 lg:block`}
                      />

                      <div className="mb-4 flex items-center gap-3">
                        <div className={`${page.bgColor} rounded-lg p-2`}>
                          <Icon className={`h-6 w-6 ${page.color}`} />
                        </div>
                        <span className="font-semibold text-muted-foreground text-sm">
                          {t("progress", {
                            index: index + 1,
                            total: bookPages.length,
                          })}
                        </span>
                      </div>
                      <h3 className="mb-4 text-balance font-bold text-2xl text-foreground sm:text-3xl">
                        {t(`pages.${page.key}.question`)}
                      </h3>
                      <p className="mb-6 text-pretty text-muted-foreground leading-relaxed">
                        {t(`pages.${page.key}.answer`)}
                      </p>

                      <Button
                        className="w-full gap-2 sm:w-auto"
                        onClick={() =>
                          window.open("https://chatgpt.com", "_blank")
                        }
                      >
                        <MessageSquare className="h-4 w-4" />
                        {t("askAI")}
                      </Button>
                    </Card>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
