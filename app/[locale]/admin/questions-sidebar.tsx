"use client";

import { format } from "date-fns";
import { Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type QADoc = Doc<"qa">;

function formatDate(value?: number) {
  if (!value) {
    return "—";
  }
  try {
    return format(value, "PPp");
  } catch {
    return "—";
  }
}

interface QuestionsSidebarProps {
  canLoadMore: boolean;
  deletingId: Id<"qa"> | null;
  isLoadingList: boolean;
  isLoadingMore: boolean;
  isSidebarOpen: boolean;
  langFilter: string;
  onDelete: (id: Id<"qa">) => void;
  onLangFilterChange: (value: string) => void;
  onLoadMore: () => void;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: Id<"qa">) => void;
  qa?: QADoc[];
  search: string;
  selectedId: Id<"qa"> | null;
  setIsSidebarOpen: (value: boolean) => void;
}

export function QuestionsSidebar({
  qa,
  isLoadingList,
  search,
  onSearchChange,
  langFilter,
  onLangFilterChange,
  selectedId,
  onSelect,
  onDelete,
  deletingId,
  onReset,
  canLoadMore,
  isLoadingMore,
  onLoadMore,
  isSidebarOpen,
  setIsSidebarOpen,
}: QuestionsSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed flex h-full w-80 flex-col border-sidebar-border border-r bg-sidebar lg:relative",
        "z-30 transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="border-sidebar-border border-b bg-sidebar/50 p-4 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-sidebar-foreground/70 text-sm uppercase tracking-wider">
            Questions
          </h2>
          <Button
            className="h-6 w-6 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={onReset}
            size="icon"
            title="New Question"
            variant="ghost"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-2">
          <Input
            className="h-8 border-sidebar-border bg-sidebar-accent/50 text-sm"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
            value={search}
          />
          <Input
            className="h-8 border-sidebar-border bg-sidebar-accent/50 text-sm"
            onChange={(event) => onLangFilterChange(event.target.value)}
            placeholder="Lang (e.g. vi, en)"
            value={langFilter}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-sidebar/30">
        <div className="space-y-2 p-3">
          {isLoadingList ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading questions...</span>
            </div>
          ) : qa && qa.length > 0 ? (
            <>
              <div className="space-y-1">
                {qa.map((item) => (
                  <button
                    className={cn(
                      "group relative w-full rounded-md border px-3 py-2.5 text-left text-sm transition-all",
                      selectedId === item._id
                        ? "border-sidebar-primary bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-sm"
                        : "border-transparent text-sidebar-foreground/70 hover:border-sidebar-border/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                    key={item._id}
                    onClick={() => onSelect(item._id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate leading-tight">
                          {item.question ?? "Untitled"}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge
                            className={cn(
                              "h-4 border-0 px-1 font-normal text-[10px]",
                              selectedId === item._id
                                ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                                : "bg-sidebar-accent-foreground/10 text-sidebar-foreground/60"
                            )}
                            variant="secondary"
                          >
                            {item.category || "No Category"}
                          </Badge>
                          {item.lang && (
                            <span className="text-[10px] uppercase tracking-wide opacity-60">
                              {item.lang}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "absolute top-2 right-2 opacity-0 transition-opacity",
                        "group-hover:opacity-100",
                        selectedId === item._id &&
                          "text-sidebar-primary-foreground"
                      )}
                    >
                      <Button
                        className={cn(
                          "h-6 w-6",
                          selectedId === item._id
                            ? "hover:bg-sidebar-primary-foreground/20 hover:text-sidebar-primary-foreground"
                            : "hover:bg-destructive/10 hover:text-destructive"
                        )}
                        disabled={deletingId === item._id}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(item._id as Id<"qa">);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        {deletingId === item._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </button>
                ))}
              </div>

              {canLoadMore && (
                <Button
                  className="mt-2 h-8 w-full text-muted-foreground text-xs hover:text-foreground"
                  disabled={isLoadingMore}
                  onClick={() => onLoadMore()}
                  variant="ghost"
                >
                  {isLoadingMore ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    "Load more questions"
                  )}
                </Button>
              )}
            </>
          ) : (
            <div className="px-4 py-12 text-center">
              <p className="mb-2 text-muted-foreground text-sm">
                No questions found.
              </p>
              <Button onClick={onReset} size="sm" variant="outline">
                Create First Question
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
