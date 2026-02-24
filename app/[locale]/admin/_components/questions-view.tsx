"use client";

import { useAction, usePaginatedQuery } from "convex/react";
import {
  Edit2,
  FileText,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function QuestionsView() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<string>("all");

  const deleteQA = useAction(api.admin.deleteQA);

  const {
    results: qaResults,
    status: qaStatus,
    loadMore,
  } = usePaginatedQuery(
    api.queries.qa.listPaginated,
    {
      search: search.trim() || undefined,
      lang: langFilter === "all" ? undefined : langFilter,
    },
    { initialNumItems: 20 }
  );

  const handleDelete = async (e: React.MouseEvent, id: Id<"qa">) => {
    e.stopPropagation(); // Prevent row click
    if (!confirm("Are you sure? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteQA({ id });
      toast({ title: "Question deleted" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleCreate = () => {
    router.push("/admin/questions/new");
  };

  const handleRowClick = (id: string) => {
    router.push(`/admin/questions/${id}`);
  };

  const isLoading = qaStatus === "LoadingFirstPage";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Questions Library
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your Q&A knowledge base and training data.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 md:flex-row">
            <div>
              <CardTitle>All Questions</CardTitle>
              <CardDescription>
                View and manage questions stored in the system.
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex w-full gap-2 md:w-auto">
              <div className="relative flex-1 md:w-[250px]">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9 pl-9"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions..."
                  value={search}
                />
              </div>
              <Select onValueChange={setLangFilter} value={langFilter}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="vi">Vietnamese</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40%]">Question</TableHead>
                  <TableHead className="w-[15%]">Category</TableHead>
                  <TableHead className="w-[15%]">Section</TableHead>
                  <TableHead className="w-[10%]">Lang</TableHead>
                  <TableHead className="w-[15%]">Preview</TableHead>
                  <TableHead className="w-[5%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [
                    "qa-skeleton-1",
                    "qa-skeleton-2",
                    "qa-skeleton-3",
                    "qa-skeleton-4",
                    "qa-skeleton-5",
                  ].map((rowKey) => (
                    <TableRow key={rowKey}>
                      <TableCell>
                        <Skeleton className="h-4 w-[250px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[40px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !qaResults || qaResults.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-[300px] text-center" colSpan={6}>
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="mb-4 rounded-full bg-muted p-4">
                          <FileText className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="font-medium text-lg">
                          No questions found
                        </p>
                        <p className="text-sm">
                          Try adjusting your search or filters.
                        </p>
                        <Button
                          className="mt-2"
                          onClick={() => {
                            setSearch("");
                            setLangFilter("all");
                          }}
                          variant="link"
                        >
                          Clear filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  qaResults.map((doc) => (
                    <TableRow
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      key={doc._id}
                      onClick={() => handleRowClick(doc._id)}
                    >
                      <TableCell className="font-medium">
                        <div className="line-clamp-2" title={doc.question}>
                          {doc.question}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="bg-muted/50 font-medium opacity-100 opacity-90 hover:bg-muted"
                          variant="outline"
                        >
                          {doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="line-clamp-1">
                          {doc.section_title || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="text-[10px] uppercase"
                          variant={doc.lang === "en" ? "default" : "secondary"}
                        >
                          {doc.lang || "vi"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="max-w-[200px] truncate text-xs">
                          {doc.answer}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              className="h-8 w-8 hover:bg-background"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(doc._id);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => handleDelete(e, doc._id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {qaStatus === "CanLoadMore" && (
          <div className="flex justify-center border-t bg-muted/20 p-4">
            <Button
              disabled={qaStatus === "LoadingMore"}
              onClick={() => loadMore(20)}
              size="sm"
              variant="outline"
            >
              {qaStatus === "LoadingMore" ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
