"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserGuideDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function UserGuideDialog({ open, onOpenChange }: UserGuideDialogProps) {
  const t = useTranslations("userGuide");

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a
                className="text-primary hover:underline"
                href="/book-soft-copy"
              >
                {t("items.softCopy")}
              </a>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a className="text-primary hover:underline" href="/questions">
                {t("items.questionList")}
              </a>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a className="text-primary hover:underline" href="/ask-ai">
                {t("items.askAI")}
              </a>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-primary">{t("items.aiAssistant")}</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a className="text-primary hover:underline" href="/about-us">
                {t("items.aboutAuthors")}
              </a>
            </li>
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <a className="text-primary hover:underline" href="/survey">
                {t("items.surveyForm")}
              </a>
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
