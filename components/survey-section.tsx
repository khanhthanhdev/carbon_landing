"use client";

import { useTranslations } from "next-intl";

export function SurveySection() {
  const t = useTranslations("SurveySection");

  return (
    <section className="bg-muted/50 py-16" data-tour="survey" id="survey">
      <div className="container mx-auto px-4 text-center">
        <h2 className="mb-4 font-bold text-2xl">{t("title")}</h2>
        <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
          {t("description")}
        </p>
        <a
          aria-label="Take our survey to help improve CarbonLearn" // Replace with actual survey link
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          href="https://docs.google.com/forms/d/e/1FAIpQLSd7ZdH_8L38kXJJ9EjqnodwZqpKK7vvIT0n3LeuzbyPiKoi6w/viewform?usp=dialog"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("buttonText")}
        </a>
      </div>
    </section>
  );
}
