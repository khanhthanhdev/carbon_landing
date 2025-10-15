"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"

interface ChatFeedbackProps {
  messageId: string
  onSubmit: (rating: number, comment: string) => void
  onCancel: () => void
}

export function ChatFeedback({ messageId, onSubmit, onCancel }: ChatFeedbackProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")

  const handleSubmit = () => {
    if (rating === 0) return
    onSubmit(rating, comment)
  }

  return (
    <Card className="mt-3 p-4 bg-background border-primary/30">
      <h4 className="text-sm font-semibold text-foreground mb-3">Rate this response</h4>

      {/* Star Rating */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoveredRating || rating) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
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
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Additional comments (optional)"
        className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
        rows={3}
      />

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={rating === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Submit Feedback
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  )
}
