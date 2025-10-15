"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  initialQuery = "",
  onSearch,
  autoFocus = false,
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

  // Update local state when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch(query.trim());
    }
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery("");
    onSearch("");
  }, [onSearch]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    onSearch(query.trim());
  }, [query, onSearch]);

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          className="pl-10 pr-10 h-12 text-base"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}