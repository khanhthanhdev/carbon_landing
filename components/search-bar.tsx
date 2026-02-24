"use client";

import { Search, X } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  initialQuery?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({
  initialQuery = "",
  onSearch,
  placeholder = "Search for carbon market information...",
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);

  // Call onSearch when debounced query changes (but not on initial mount if empty)
  useEffect(() => {
    if (debouncedQuery.trim() !== "" || initialQuery !== "") {
      onSearch(debouncedQuery.trim());
    }
  }, [debouncedQuery, onSearch, initialQuery]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onSearch("");
  }, [onSearch]);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSearch(query.trim());
    },
    [query, onSearch]
  );

  return (
    <form className={cn("relative", className)} onSubmit={handleSubmit}>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-12 pr-10 pl-10 text-base"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          type="text"
          value={query}
        />
        {query && (
          <Button
            aria-label="Clear search"
            className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
