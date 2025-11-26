"use client";

import { useEffect, useMemo, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useTranslations } from "next-intl";

const TOUR_STORAGE_KEY = "carbonlearn-tour-completed";

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1024;
}

export function TourGuide() {
  const t = useTranslations("tour");
  const [hasMounted, setHasMounted] = useState(false);
  const [run, setRun] = useState(false);
  const [shouldDisplay, setShouldDisplay] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (!hasMounted || isMobile) {
      return;
    }

    const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY);

    if (!hasCompletedTour) {
      setShouldDisplay(true);
      const timer = window.setTimeout(() => {
        setRun(true);
      }, 1200);

      return () => window.clearTimeout(timer);
    }
  }, [hasMounted, isMobile]);

  const steps = useMemo<Step[]>(() => {
    if (!hasMounted) {
      return [];
    }

    return [
      {
        target: '[data-tour="nav-books"]',
        title: t("navBooks.title"),
        content: t("navBooks.description"),
        disableBeacon: true,
        placement: "bottom",
      },
      {
        target: '[data-tour="nav-search"]',
        title: t("navSearch.title"),
        content: t("navSearch.description"),
        placement: "bottom",
      },
      {
        target: '[data-tour="nav-ask-ai"]',
        title: t("navAskAI.title"),
        content: t("navAskAI.description"),
        placement: "bottom",
      },
      {
        target: '[data-tour="nav-about"]',
        title: t("navAbout.title"),
        content: t("navAbout.description"),
        placement: "bottom",
      },
      {
        target: '[data-tour="book-title"]',
        title: t("bookSection.title"),
        content: t("bookSection.description"),
        placement: "bottom",
      },
      {
        target: '[data-tour="survey"]',
        title: t("survey.title"),
        content: t("survey.description"),
        placement: "top",
      },
    ];
  }, [hasMounted, t]);

  const handleJoyrideCallback = ({ status, index }: CallBackProps) => {
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      localStorage.setItem(TOUR_STORAGE_KEY, "completed");
      setRun(false);
      setShouldDisplay(false);
    }
    
    // Scroll to center target element and modal on step change
    if (status === STATUS.RUNNING && typeof index === "number") {
      const step = steps[index];
      if (step) {
        const targetEl = document.querySelector(step.target as string);
        if (targetEl) {
          setTimeout(() => {
            // Scroll target to center
            const rect = targetEl.getBoundingClientRect();
            const elementCenter = rect.top + rect.height / 2;
            const windowCenter = window.innerHeight / 2;
            const scrollOffset = elementCenter - windowCenter;
            
            window.scrollBy({
              top: scrollOffset,
              behavior: "smooth",
            });
          }, 150);
        }
      }
    }
  };

  if (!hasMounted || !shouldDisplay || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#16a34a",
          zIndex: 10000,
          arrowColor: "#fff",
        },
        tooltip: {
          animation: "joyride-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        } as React.CSSProperties,
      }}
      locale={{
        back: t("actions.back"),
        close: t("actions.close"),
        last: t("actions.last"),
        next: t("actions.next"),
        skip: t("actions.skip"),
      }}
    />
  );
}
