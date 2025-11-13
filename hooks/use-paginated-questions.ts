"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState, useCallback, useMemo } from "react"

const ITEMS_PER_PAGE = 10

export function usePaginatedQuestions(section?: string, category?: string) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allQuestions, setAllQuestions] = useState<any[]>([])
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false)

  const result = useQuery(
    api.questions.getPaginated,
    {
      paginationOpts: {
        numItems: ITEMS_PER_PAGE,
        cursor,
      },
      section,
      category,
    }
  )

  // Accumulate questions as we paginate
  const questions = useMemo(() => {
    if (!result) return allQuestions

    if (!hasLoadedInitial) {
      setHasLoadedInitial(true)
      setAllQuestions(result.page)
      return result.page
    }

    // If cursor changed and we got new data, append it
    if (cursor && result.page.length > 0) {
      const existingIds = new Set(allQuestions.map((q) => q.id))
      const newQuestions = result.page.filter((q) => !existingIds.has(q.id))
      
      if (newQuestions.length > 0) {
        const updated = [...allQuestions, ...newQuestions]
        setAllQuestions(updated)
        return updated
      }
    }

    return allQuestions
  }, [result, allQuestions, cursor, hasLoadedInitial])

  const loadMore = useCallback(() => {
    if (result?.continueCursor) {
      setCursor(result.continueCursor)
    }
  }, [result])

  const hasMore = result?.isDone === false

  const reset = useCallback(() => {
    setCursor(null)
    setAllQuestions([])
    setHasLoadedInitial(false)
  }, [])

  return {
    questions,
    loadMore,
    hasMore,
    isLoading: !result,
    reset,
  }
}
