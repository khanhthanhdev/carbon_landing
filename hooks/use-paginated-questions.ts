"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"

const ITEMS_PER_PAGE = 10

type SectionState = {
  section_id: string
  section_number: string
  section_title: string
  questions: Array<any>
  question_count: number
  hasMore: boolean
}

export function usePaginatedQuestions(lang?: string, initialSection?: string) {
  const initialSectionNumber = useMemo(() => {
    const parsed = parseInt(initialSection ?? "1", 10)
    return Number.isNaN(parsed) ? 1 : parsed
  }, [initialSection])

  const normalizedInitialSection = initialSectionNumber.toString()

  const [sections, setSections] = useState<Record<string, SectionState>>({})
  const sectionsRef = useRef<Record<string, SectionState>>({})
  const [currentSection, setCurrentSection] = useState(normalizedInitialSection)
  const [sectionToFetch, setSectionToFetch] = useState(normalizedInitialSection)
  const [cursorBySection, setCursorBySection] = useState<Record<string, string | null>>({
    [normalizedInitialSection]: null,
  })
  const [continuationCursors, setContinuationCursors] = useState<Record<string, string | null>>({})
  const [nextSectionToLoad, setNextSectionToLoad] = useState(initialSectionNumber + 1)
  const [hasMoreSections, setHasMoreSections] = useState(true)

  const ensureCursorEntry = useCallback((sectionKey: string) => {
    setCursorBySection((prev) => {
      if (prev[sectionKey] !== undefined) {
        return prev
      }
      return { ...prev, [sectionKey]: null }
    })
  }, [])

  useEffect(() => {
    sectionsRef.current = {}
    setSections({})
    setCurrentSection(normalizedInitialSection)
    setSectionToFetch(normalizedInitialSection)
    setCursorBySection({ [normalizedInitialSection]: null })
    setContinuationCursors({})
    setNextSectionToLoad(initialSectionNumber + 1)
    setHasMoreSections(true)
  }, [lang, normalizedInitialSection, initialSectionNumber])

  const cursor = cursorBySection[sectionToFetch] ?? null
  const result = useQuery(
    api.questions.getPaginated,
    {
      paginationOpts: {
        numItems: ITEMS_PER_PAGE,
        cursor,
      },
      lang,
      section: sectionToFetch,
    },
  )

  useEffect(() => {
    if (!result) return

    const sectionKey = sectionToFetch
    setContinuationCursors((prev) => ({
      ...prev,
      [sectionKey]: result.continueCursor ?? null,
    }))

    const hadExistingSection = Boolean(sectionsRef.current[sectionKey])

    if (result.page.length === 0) {
      if (!hadExistingSection) {
        setHasMoreSections(false)
      } else {
        setSections((prev) => {
          const previous = prev[sectionKey]
          if (!previous) return prev
          const updatedSection = {
            ...previous,
            hasMore: false,
          }
          const updated = { ...prev, [sectionKey]: updatedSection }
          sectionsRef.current = updated
          return updated
        })
      }
      return
    }

    setSections((prev) => {
      const previous = prev[sectionKey]
      const existingIds = new Set(previous?.questions.map((question) => question.id) ?? [])
      const uniqueQuestions = result.page.filter((question) => !existingIds.has(question.id))
      const updatedQuestions = previous ? [...previous.questions, ...uniqueQuestions] : uniqueQuestions
      const sectionTitle =
        previous?.section_title ??
        result.page[0]?.section_title ??
        `Section ${sectionKey}`

      const updatedSection: SectionState = {
        section_id: `section_${sectionKey}`,
        section_number: sectionKey,
        section_title: sectionTitle,
        questions: updatedQuestions,
        question_count: updatedQuestions.length,
        hasMore: !result.isDone,
      }

      const updated = { ...prev, [sectionKey]: updatedSection }
      sectionsRef.current = updated
      return updated
    })

    setCurrentSection(sectionKey)
    setNextSectionToLoad((prev) => {
      const parsed = parseInt(sectionKey, 10)
      if (Number.isNaN(parsed)) {
        return prev
      }
      return Math.max(prev, parsed + 1)
    })
  }, [result, sectionToFetch])

  const loadMore = useCallback(() => {
    const nextCursor = continuationCursors[currentSection]
    if (!nextCursor) return
    setCursorBySection((prev) => ({
      ...prev,
      [currentSection]: nextCursor,
    }))
  }, [continuationCursors, currentSection])

  const isFetchingNextSection = sectionToFetch !== currentSection
  const loadNextSection = useCallback(() => {
    if (!hasMoreSections || isFetchingNextSection) return
    const nextKey = nextSectionToLoad.toString()
    ensureCursorEntry(nextKey)
    setSectionToFetch(nextKey)
  }, [ensureCursorEntry, hasMoreSections, isFetchingNextSection, nextSectionToLoad])

  const sectionsArray = useMemo(() => {
    return Object.values(sections).sort(
      (a, b) => (parseInt(a.section_number, 10) || 0) - (parseInt(b.section_number, 10) || 0),
    )
  }, [sections])

  const currentSectionState = sections[currentSection]
  const hasMoreCurrentSection = currentSectionState?.hasMore ?? false
  const isLoadingCurrentSection = sectionToFetch === currentSection && !result
  const isLoadingInitialSection = sectionsArray.length === 0 && !result

  return {
    sections: sectionsArray,
    loadMore,
    hasMore: hasMoreCurrentSection,
    isLoading: isLoadingInitialSection,
    isLoadingCurrentSection,
    loadNextSection,
    hasMoreSections,
    isLoadingNextSection: isFetchingNextSection,
    currentSection,
  }
}
