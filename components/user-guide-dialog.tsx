"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Check } from "lucide-react"
import { useTranslations } from "next-intl"

interface UserGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserGuideDialog({ open, onOpenChange }: UserGuideDialogProps) {
  const t = useTranslations("userGuide")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a href="/book-soft-copy" className="text-primary hover:underline">
                {t("items.softCopy")}
              </a>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a href="/questions" className="text-primary hover:underline">
                {t("items.questionList")}
              </a>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a href="/ask-ai" className="text-primary hover:underline">
                {t("items.askAI")}
              </a>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-primary">
                {t("items.aiAssistant")}
              </span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a href="/about-us" className="text-primary hover:underline">
                {t("items.aboutAuthors")}
              </a>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a href="/survey" className="text-primary hover:underline">
                {t("items.surveyForm")}
              </a>
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
