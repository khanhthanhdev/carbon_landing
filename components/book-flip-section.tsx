"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, Recycle, Globe, Award, ExternalLink, MessageSquare, Leaf } from "lucide-react";
import { useTranslations } from "next-intl";

const bookPages = [
  {
    icon: TrendingDown,
    color: "text-primary",
    bgColor: "bg-primary/10",
    key: "carbonTrading",
    sources: [
      { title: "UNFCCC Carbon Trading Guide", url: "https://unfccc.int/process/the-kyoto-protocol/mechanisms" },
      {
        title: "EU Emissions Trading System",
        url: "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en",
      },
      { title: "World Bank Carbon Pricing", url: "https://www.worldbank.org/en/programs/pricing-carbon" },
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
      { title: "Business Carbon Calculator", url: "https://www.carbontrust.com/our-services/footprinting" },
      { title: "Green Business Guide", url: "https://www.greenbusinessbureau.com/" },
    ],
  },
  {
    icon: Globe,
    color: "text-accent",
    bgColor: "bg-accent/10",
    key: "businessImpact",
    sources: [
      { title: "Carbon Credit Markets", url: "https://www.goldstandard.org/" },
      { title: "Business Impact Assessment", url: "https://sciencebasedtargets.org/" },
      { title: "Sustainability ROI Calculator", url: "https://www.cdp.net/" },
      { title: "Green Finance Institute", url: "https://www.greenfinanceinstitute.co.uk/" },
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
      { title: "ISO 14064 Guidelines", url: "https://www.iso.org/standard/66453.html" },
    ],
  },
  {
    icon: Leaf,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    key: "callToAction",
    sources: [
      { title: "Net Zero Business Guide", url: "https://www.un.org/en/climatechange/net-zero-coalition" },
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
            const index = Number.parseInt(entry.target.getAttribute("data-index") || "0", 10);
            setVisiblePages((prev) => (prev.includes(index) ? prev : [...prev, index]));
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
    <section ref={sectionRef} className="py-20 lg:py-32 bg-muted/30" id="about">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">{t("title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">{t("description")}</p>
        </div>

        <div className="max-w-6xl mx-auto space-y-32">
          {bookPages.map((page, index) => {
            const Icon = page.icon;
            const isVisible = visiblePages.includes(index);
            const isEven = index % 2 === 0;

            return (
              <div key={page.key} data-index={index} className="book-page relative">
                <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-start ${isEven ? "" : "lg:grid-flow-dense"}`}>
                  <div
                    className={`${isEven ? "" : "lg:col-start-2"} ${isVisible ? "animate-fade-in-up" : "opacity-0"} relative`}
                    style={{ animationDelay: "0.2s" }}
                  >
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        {t("resourcesTitle")}
                      </h4>
                      {page.sources.map((source) => (
                        <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="block group">
                          <Card className="p-4 hover:shadow-md transition-all hover:border-primary/50 hover:-translate-y-1 relative overflow-hidden">
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${
                                isEven ? "from-primary/50 to-primary" : "from-secondary/50 to-secondary"
                              } opacity-0 group-hover:opacity-100 transition-opacity`}
                            />
                            <div className="flex items-start justify-between gap-3 pl-2">
                              <div className="flex-1">
                                <p className="font-medium text-foreground group-hover:text-primary transition-colors text-sm leading-relaxed">
                                  {source.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 truncate">{new URL(source.url).hostname}</p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
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
                    <Card className="p-8 shadow-lg hover:shadow-xl transition-shadow border-2 relative">
                      <div
                        className={`absolute ${isEven ? "right-0 top-1/2" : "left-0 top-1/2"} w-8 h-0.5 bg-gradient-to-r ${
                          isEven ? "from-primary/30 to-transparent" : "from-transparent to-primary/30"
                        } -translate-y-1/2 hidden lg:block`}
                      />

                      <div className="flex items-center gap-3 mb-4">
                        <div className={`${page.bgColor} rounded-lg p-2`}>
                          <Icon className={`h-6 w-6 ${page.color}`} />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {t("progress", { index: index + 1, total: bookPages.length })}
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 text-balance">
                        {t(`pages.${page.key}.question`)}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-pretty mb-6">{t(`pages.${page.key}.answer`)}</p>

                      <Button className="w-full sm:w-auto gap-2" onClick={() => window.open("https://chatgpt.com", "_blank")}>
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
