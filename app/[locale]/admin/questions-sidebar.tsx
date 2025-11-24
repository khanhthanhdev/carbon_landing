"use client";

import { Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type QADoc = Doc<"qa">;

function formatDate(value?: number) {
  if (!value) return "—";
  try {
    return format(value, "PPp");
  } catch {
    return "—";
  }
}

interface QuestionsSidebarProps {
  qa?: QADoc[];
  isLoadingList: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  langFilter: string;
  onLangFilterChange: (value: string) => void;
  selectedId: Id<"qa"> | null;
  onSelect: (id: Id<"qa">) => void;
  onDelete: (id: Id<"qa">) => void;
  deletingId: Id<"qa"> | null;
  onReset: () => void;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  isSidebarOpen: boolean;
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
        "fixed lg:relative w-80 h-full bg-sidebar border-r border-sidebar-border flex flex-col",
        "z-30 transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="p-4 border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-sidebar-foreground/70">
            Questions
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={onReset}
            title="New Question"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-8 text-sm bg-sidebar-accent/50 border-sidebar-border"
          />
          <Input
            placeholder="Lang (e.g. vi, en)"
            value={langFilter}
            onChange={(event) => onLangFilterChange(event.target.value)}
            className="h-8 text-sm bg-sidebar-accent/50 border-sidebar-border"
          />
        </div>
      </div>

    <div className="flex-1 overflow-y-auto bg-sidebar/30">
        <div className="p-3 space-y-2">
          {isLoadingList ? (
            <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading questions...</span>
            </div>
          ) : qa && qa.length > 0 ? (
            <>
              <div className="space-y-1">
                {qa.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => onSelect(item._id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-md transition-all group relative border text-sm",
                      selectedId === item._id
                        ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary shadow-sm font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground border-transparent hover:border-sidebar-border/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate leading-tight">
                          {item.question ?? "Untitled"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "h-4 px-1 text-[10px] font-normal border-0",
                              selectedId === item._id
                                ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                                : "bg-sidebar-accent-foreground/10 text-sidebar-foreground/60"
                            )}
                          >
                            {item.category || "No Category"}
                          </Badge>
                          {item.lang && (
                            <span className="text-[10px] opacity-60 uppercase tracking-wide">
                              {item.lang}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "absolute right-2 top-2 opacity-0 transition-opacity",
                        "group-hover:opacity-100",
                        selectedId === item._id &&
                          "text-sidebar-primary-foreground"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6",
                          selectedId === item._id
                            ? "hover:bg-sidebar-primary-foreground/20 hover:text-sidebar-primary-foreground"
                            : "hover:bg-destructive/10 hover:text-destructive"
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(item._id as Id<"qa">);
                        }}
                        disabled={deletingId === item._id}
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
                  onClick={() => onLoadMore()}
                  disabled={isLoadingMore}
                  variant="ghost"
                  className="w-full mt-2 text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    "Load more questions"
                  )}
                </Button>
              )}
            </>
          ) : (
            <div className="py-12 text-center px-4">
              <p className="text-sm text-muted-foreground mb-2">
                No questions found.
              </p>
              <Button variant="outline" size="sm" onClick={onReset}>
                Create First Question
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
