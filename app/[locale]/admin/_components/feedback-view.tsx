"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

function formatDate(value?: number) {
  if (!value) return "—";
  try {
    return format(value, "PPp");
  } catch {
    return "—";
  }
}

export function FeedbackView() {
  const feedback = useQuery(api.feedback.list);

  if (feedback === undefined) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading feedback...
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageRating =
    feedback.length === 0
      ? 0
      : feedback.reduce((sum, item) => sum + (item.rating ?? 0), 0) /
        feedback.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-4xl font-bold">
            {feedback.length}
          </CardContent>
        </Card>
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">out of 5</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Latest Response
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">
            {feedback[0] ? formatDate(feedback[0].createdAt) : "—"}
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/40">
          <CardTitle className="text-lg">Feedback Inbox</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {feedback.length} {feedback.length === 1 ? "response" : "responses"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {feedback.length === 0 ? (
            <div className="flex items-center justify-center py-12 px-4">
              <p className="text-muted-foreground text-sm">
                No feedback received yet.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[520px]">
              <div className="space-y-3 p-4">
                {feedback.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-lg border bg-card/50 p-4 transition hover:bg-card hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-base">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-900 border-amber-200"
                        >
                          ⭐ {item.rating}/5
                        </Badge>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 mb-2">
                      {item.comment}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
