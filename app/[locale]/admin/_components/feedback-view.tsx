"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";

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

export function FeedbackView() {
  const feedback = useQuery(api.feedback.list);

  if (feedback === undefined) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
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
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent className="font-bold text-4xl">
            {feedback.length}
          </CardContent>
        </Card>
        <Card className="border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-4xl">{averageRating.toFixed(1)}</div>
            <p className="mt-1 text-muted-foreground text-xs">out of 5</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              Latest Response
            </CardTitle>
          </CardHeader>
          <CardContent className="font-medium text-sm">
            {feedback[0] ? formatDate(feedback[0].createdAt) : "—"}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/40">
          <CardTitle className="text-lg">Feedback Inbox</CardTitle>
          <Badge className="ml-auto" variant="secondary">
            {feedback.length} {feedback.length === 1 ? "response" : "responses"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {feedback.length === 0 ? (
            <div className="flex items-center justify-center px-4 py-12">
              <p className="text-muted-foreground text-sm">
                No feedback received yet.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[520px]">
              <div className="space-y-3 p-4">
                {feedback.map((item) => (
                  <div
                    className="rounded-lg border bg-card/50 p-4 transition hover:border-primary/30 hover:bg-card hover:shadow-sm"
                    key={item._id}
                  >
                    <div className="mb-3 flex flex-wrap justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-base">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.email}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Badge
                          className="border-amber-200 bg-amber-50 text-amber-900"
                          variant="outline"
                        >
                          ⭐ {item.rating}/5
                        </Badge>
                      </div>
                    </div>
                    <p className="mb-2 whitespace-pre-wrap text-foreground/80 text-sm leading-relaxed">
                      {item.comment}
                    </p>
                    <p className="text-muted-foreground text-xs">
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
