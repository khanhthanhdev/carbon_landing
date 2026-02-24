"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageSquare,
  Plus,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AIChatSidebarProps {
  isOpen: boolean;
  onNewChat?: () => void;
  onToggle: () => void;
  onTopicChange?: (topic: string) => void;
  selectedTopic?: string;
  sessionId: string;
}

export function AIChatSidebar({
  isOpen,
  onToggle,
  sessionId,
  selectedTopic = "general",
  onTopicChange,
  onNewChat,
}: AIChatSidebarProps) {
  const t = useTranslations("aiChat.sidebar");

  return (
    <>
      {/* Toggle button for mobile */}
      <Button
        className="fixed top-24 left-4 z-40 border-border bg-background hover:bg-accent lg:hidden"
        onClick={onToggle}
        size="icon"
        variant="outline"
      >
        {isOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {/* Sidebar - Fixed on desktop, overlay on mobile */}
      <aside
        className={`fixed inset-y-0 top-16 left-0 z-30 flex h-[calc(100vh-64px)] w-72 flex-col border-sidebar-border border-r bg-sidebar transition-transform duration-300 lg:fixed lg:top-16 lg:h-[calc(100vh-80px)] ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 border-sidebar-border border-b bg-sidebar p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sidebar-foreground text-sm">
                {t("title")}
              </h2>
              <p className="text-sidebar-foreground/60 text-xs">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-4 p-4">
            {/* Topic Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sidebar-foreground text-xs uppercase tracking-wide">
                  {t("topicsTitle")}
                </h3>
              </div>
              <p className="px-1 text-sidebar-foreground/60 text-xs leading-relaxed">
                {t("topicsDescription")}
              </p>

              <div className="grid grid-cols-1 gap-2">
                {(
                  [
                    "general",
                    "trading",
                    "policy",
                    "projects",
                    "accounting",
                    "compliance",
                    "voluntary",
                    "technology",
                  ] as const
                ).map((topic) => (
                  <Button
                    className={`h-auto justify-start px-3 py-2 text-xs ${
                      selectedTopic === topic
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                    key={topic}
                    onClick={() => onTopicChange?.(topic)}
                    size="sm"
                    variant={selectedTopic === topic ? "default" : "ghost"}
                  >
                    <span className="text-left leading-tight">
                      {t(`topics.${topic}`)}
                    </span>
                    {selectedTopic === topic && (
                      <Badge
                        className="ml-auto px-1.5 py-0 text-xs"
                        variant="secondary"
                      >
                        ✓
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="space-y-2 rounded-lg border border-sidebar-border/50 bg-sidebar-accent/50 p-3">
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-sidebar-foreground text-xs">
                    {t("poweredBy")}
                  </h3>
                  <p className="text-sidebar-foreground/70 text-xs leading-relaxed">
                    {t("poweredByDescription")}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h3 className="px-1 font-semibold text-sidebar-foreground text-xs uppercase tracking-wide">
                {t("features")}
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 px-1 text-sidebar-foreground/70 text-xs">
                  <span className="mt-1 font-bold text-primary">✓</span>
                  <span>{t("verifiedSources")}</span>
                </li>
                <li className="flex items-start gap-2 px-1 text-sidebar-foreground/70 text-xs">
                  <span className="mt-1 font-bold text-primary">✓</span>
                  <span>{t("multilingual")}</span>
                </li>
                <li className="flex items-start gap-2 px-1 text-sidebar-foreground/70 text-xs">
                  <span className="mt-1 font-bold text-primary">✓</span>
                  <span>{t("contextAware")}</span>
                </li>
                <li className="flex items-start gap-2 px-1 text-sidebar-foreground/70 text-xs">
                  <span className="mt-1 font-bold text-primary">✓</span>
                  <span>{t("realTimeAccuracy")}</span>
                </li>
              </ul>
            </div>

            {/* Privacy Note */}
            <div className="space-y-2 rounded-lg border border-sidebar-border/50 bg-sidebar-accent/30 p-3">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-sidebar-foreground/60" />
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-sidebar-foreground text-xs">
                    {t("privacy")}
                  </h3>
                  <p className="text-sidebar-foreground/60 text-xs leading-relaxed">
                    {t("privacyDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 space-y-3 border-sidebar-border border-t bg-sidebar p-4">
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onNewChat}
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("newChat")}
          </Button>
          <div>
            <p className="break-all font-mono text-sidebar-foreground/50 text-xs">
              {sessionId.substring(0, 16)}...
            </p>
            <p className="mt-1 text-sidebar-foreground/40 text-xs">
              {t("sessionId")}
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onToggle}
          type="button"
        />
      )}
    </>
  );
}
