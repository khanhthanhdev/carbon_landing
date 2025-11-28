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
  totalCount: number // Total questions in this section from getSections
  hasMore: boolean
}

export function usePaginatedQuestions(lang?: string, initialSection?: string) {
  const initialSectionNumber = useMemo(() => {
    const parsed = parseInt(initialSection ?? "1", 10)
    return Number.isNaN(parsed) ? 1 : parsed
  }, [initialSection])

  const normalizedInitialSection = initialSectionNumber.toString()

  // State for loaded sections data
  const [sections, setSections] = useState<Record<string, SectionState>>({})
  const sectionsRef = useRef<Record<string, SectionState>>({})
  
  // Current section being viewed/loaded
  const [currentSectionNumber, setCurrentSectionNumber] = useState(normalizedInitialSection)
  
  // Pagination cursor for current section
  const [cursor, setCursor] = useState<string | null>(null)
  
  // Track loading state separately to avoid flicker
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoadingSection, setIsLoadingSection] = useState(false)
  
  // Track previous result to detect changes
  const prevResultRef = useRef<typeof result | null>(null)

  // Reset when language changes
  useEffect(() => {
    sectionsRef.current = {}
    setSections({})
    setCurrentSectionNumber(normalizedInitialSection)
    setCursor(null)
    setIsLoadingMore(false)
    setIsLoadingSection(false)
  }, [lang, normalizedInitialSection])

  // Fetch available sections info (for knowing total counts and section order)
  const sectionsInfo = useQuery(api.qa.getSections, { lang })

  // Available sections sorted by number
  const availableSections = useMemo(() => {
    if (!sectionsInfo) return []
    return sectionsInfo.sort(
      (a, b) => parseInt(a.section_number, 10) - parseInt(b.section_number, 10)
    )
  }, [sectionsInfo])

  // Get the index of current section in available sections
  const currentSectionIndex = useMemo(() => {
    return availableSections.findIndex(s => s.section_number === currentSectionNumber)
  }, [availableSections, currentSectionNumber])

  // Check if there are more sections after the current one
  const hasMoreSections = useMemo(() => {
    if (availableSections.length === 0) return true // Still loading
    return currentSectionIndex < availableSections.length - 1
  }, [availableSections, currentSectionIndex])

  // Fetch paginated questions for current section
  const result = useQuery(
    api.qa.getPaginated,
    {
      paginationOpts: {
        numItems: ITEMS_PER_PAGE,
        cursor,
      },
      lang,
      section: currentSectionNumber,
    }
  )

  // Process query results and update loading states
  useEffect(() => {
    if (!result) return

    // Result received - clear loading states
    setIsLoadingMore(false)
    setIsLoadingSection(false)

    const sectionKey = currentSectionNumber
    const sectionInfo = availableSections.find(s => s.section_number === sectionKey)

    setSections((prev) => {
      const previous = prev[sectionKey]
      const existingIds = new Set(previous?.questions.map((q) => q.id) ?? [])
      const uniqueQuestions = result.page.filter((q) => !existingIds.has(q.id))
      const updatedQuestions = previous 
        ? [...previous.questions, ...uniqueQuestions] 
        : uniqueQuestions

      const sectionTitle =
        previous?.section_title ??
        sectionInfo?.section_title ??
        result.page[0]?.section_title ??
        `Section ${sectionKey}`

      const totalCount = sectionInfo?.question_count ?? updatedQuestions.length

      const updatedSection: SectionState = {
        section_id: `section_${sectionKey}`,
        section_number: sectionKey,
        section_title: sectionTitle,
        questions: updatedQuestions,
        question_count: updatedQuestions.length,
        totalCount,
        hasMore: !result.isDone,
      }

      const updated = { ...prev, [sectionKey]: updatedSection }
      sectionsRef.current = updated
      return updated
    })
    
    prevResultRef.current = result
  }, [result, currentSectionNumber, availableSections])

  // Load more questions in current section
  const loadMore = useCallback(() => {
    if (!result?.continueCursor || result.isDone) return
    setIsLoadingMore(true)
    setCursor(result.continueCursor)
  }, [result])

  // Load next section
  const loadNextSection = useCallback(() => {
    if (!hasMoreSections || currentSectionIndex < 0) return
    
    const nextSection = availableSections[currentSectionIndex + 1]
    if (!nextSection) return

    const nextSectionNumber = nextSection.section_number
    
    // Set loading state and reset cursor for new section
    setIsLoadingSection(true)
    setCursor(null)
    setCurrentSectionNumber(nextSectionNumber)
  }, [hasMoreSections, currentSectionIndex, availableSections])

  // Build sorted sections array
  const sectionsArray = useMemo(() => {
    return Object.values(sections).sort(
      (a, b) => (parseInt(a.section_number, 10) || 0) - (parseInt(b.section_number, 10) || 0)
    )
  }, [sections])

  // Current section state
  const currentSectionState = sections[currentSectionNumber]
  const hasMoreCurrentSection = currentSectionState?.hasMore ?? (result ? !result.isDone : true)
  
  // Loading states - use tracked state to avoid flicker
  const isLoadingInitial = !sectionsInfo || (sectionsArray.length === 0 && !result)
  const isLoadingCurrentSection = isLoadingMore || (!result && sectionsArray.length > 0)
  const isLoadingNextSection = isLoadingSection

  return {
    sections: sectionsArray,
    availableSections,
    loadMore,
    hasMore: hasMoreCurrentSection,
    isLoading: isLoadingInitial,
    isLoadingCurrentSection,
    loadNextSection,
    hasMoreSections,
    isLoadingNextSection,
    currentSection: currentSectionNumber,
  }
}
