"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ChatFeedbackProps {
  messageId: string;
  onCancel: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

export function ChatFeedback({
  messageId,
  onSubmit,
  onCancel,
}: ChatFeedbackProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (rating === 0) {
      return;
    }
    onSubmit(rating, comment);
  };

  return (
    <Card className="mt-3 border-primary/30 bg-background p-4">
      <h4 className="mb-3 font-semibold text-foreground text-sm">
        Rate this response
      </h4>

      {/* Star Rating */}
      <div className="mb-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            className="transition-transform hover:scale-110"
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            type="button"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoveredRating || rating)
                  ? "fill-yellow-500 text-yellow-500"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-muted-foreground text-sm">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        onChange={(e) => setComment(e.target.value)}
        placeholder="Additional comments (optional)"
        rows={3}
        value={comment}
      />

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={rating === 0}
          onClick={handleSubmit}
          size="sm"
        >
          Submit Feedback
        </Button>
        <Button onClick={onCancel} size="sm" variant="outline">
          Cancel
        </Button>
      </div>
    </Card>
  );
}
