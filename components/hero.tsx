"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen } from "lucide-react"
import { Link } from "@/lib/navigation"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { UserGuideDialog } from "./user-guide-dialog"

export function Hero() {
  const t = useTranslations("hero")
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false)

  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisited")
    if (!hasVisited) {
      setIsUserGuideOpen(true)
      localStorage.setItem("hasVisited", "true")
    }
  }, [])

  return (

      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-primary/20 text-foreground px-4 py-2 rounded-full mb-8 text-sm font-medium">
            {t("badge")}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            {t("title")}
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("description")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/#book" className="w-full sm:flex-1 sm:max-w-[240px]">
              <Button
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-base group"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                {t("readBook")}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/books" className="w-full sm:flex-1 sm:max-w-[240px]">
              <Button size="lg" variant="outline" className="w-full px-8 py-6 text-base border-2 bg-transparent">
                {t("browseQuestions")}
              </Button>
            </Link>
            <Link href="/ask-ai" className="w-full sm:flex-1 sm:max-w-[240px]">
              <Button size="lg" className="w-full px-8 py-6 text-base bg-secondary text-secondary-foreground">
                {t("askAI")}
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 sm:gap-16 pt-8 border-t border-border/50">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">100+</div>
              <div className="text-sm text-muted-foreground">{t("stats.questions")}</div>
            </div>
            <div className="h-12 w-px bg-border/50" />
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">6</div>
              <div className="text-sm text-muted-foreground">{t("stats.categories")}</div>
            </div>
            <div className="h-12 w-px bg-border/50" />
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">AI</div>
              <div className="text-sm text-muted-foreground">{t("stats.support")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
