# SearchResults Component

## Overview

The `SearchResults` component is a comprehensive React component that displays search results in a card format with proper loading, error, and empty states. It's designed to handle all the different states of a search operation and provide a consistent user experience.

## Features

### ✅ Requirements Implemented

- **3.2**: Display results in card format with question, answer preview, category, and sources
- **3.3**: Show loading skeleton UI when results are loading  
- **3.4**: Display helpful message when no results found
- **3.6**: Show result count and search type indicator
- **3.7**: Display search metadata (time taken, cache status)
- **4.8**: Display search metadata (time taken, result count)

### Core Features

1. **Result Cards**: Each result is displayed in a card with:
   - Question as heading
   - Category badge and relevance score
   - Answer with expand/collapse for long content
   - Source links with external icons
   - Search reason badges (Semantic/Keyword)

2. **Loading State**: Animated skeleton showing placeholder cards while searching

3. **Error State**: Clear error message with retry button when search fails

4. **Empty States**: 
   - Initial state when no query entered
   - No results state with helpful suggestions

5. **Metadata Display**: Shows search performance metrics including:
   - Result count
   - Search type used
   - Response time
   - Cache status

## Props Interface

```typescript
interface SearchResultsProps {
  // Data
  results: SearchResult[];
  metadata?: SearchMetadata;
  query: string;
  
  // State
  isLoading: boolean;
  error?: Error | null;
  
  // Event handlers
  onRetry?: () => void;
  onClearSearch?: () => void;
  
  // UI customization
  className?: string;
}
```

## Usage Example

```tsx
import { SearchResults } from "@/components/search-results";

function SearchPage() {
  const { data, isLoading, error, refetch } = useSearch({
    query: "carbon trading",
    searchType: "hybrid"
  });

  return (
    <SearchResults
      results={data?.results || []}
      metadata={data?.metadata}
      query="carbon trading"
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      onClearSearch={() => setQuery("")}
    />
  );
}
```

## Component Structure

```
SearchResults
├── SearchResultsSkeleton (loading state)
├── Error State Card
├── Initial State Card  
├── No Results Card
└── Results Display
    ├── SearchResultsHeader (metadata)
    └── ResultCard[] (individual results)
        ├── Question Header
        ├── Answer (with expand/collapse)
        └── Sources Section
```

## Styling

The component uses Tailwind CSS classes and follows the existing design system:
- Cards use the `Card` component from `@/components/ui/card`
- Badges use the `Badge` component for categories and scores
- Buttons use the `Button` component for interactions
- Responsive design with mobile-first approach

## Accessibility

- Proper semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Screen reader friendly content
- High contrast colors for readability

## Integration

The component integrates seamlessly with:
- `useSearch` hook for data fetching
- Translation system via `next-intl`
- Existing UI component library
- Search page layout and filters