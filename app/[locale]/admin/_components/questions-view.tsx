"use client";

import { useState } from "react";
import { useAction, usePaginatedQuery } from "convex/react";
import { Plus, Edit2, Trash2, MoreVertical, Search, FileText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

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
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await deleteQA({ id });
      toast({ title: "Question deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Questions Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Q&A knowledge base and training data.
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div>
              <CardTitle>All Questions</CardTitle>
              <CardDescription>
                View and manage questions stored in the system.
              </CardDescription>
            </div>
            
            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={langFilter} onValueChange={setLangFilter}>
                <SelectTrigger className="w-[130px] h-9">
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
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : !qaResults || qaResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-[300px] text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="bg-muted p-4 rounded-full mb-4">
                          <FileText className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="text-lg font-medium">No questions found</p>
                        <p className="text-sm">Try adjusting your search or filters.</p>
                        <Button variant="link" onClick={() => { setSearch(""); setLangFilter("all"); }} className="mt-2">
                           Clear filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  qaResults.map((doc) => (
                    <TableRow 
                        key={doc._id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(doc._id)}
                    >
                      <TableCell className="font-medium">
                        <div className="line-clamp-2" title={doc.question}>
                          {doc.question}
                        </div>
                      </TableCell>
                      <TableCell>
                          <Badge variant="outline" className="font-medium bg-muted/50 opacity-90 hover:bg-muted opacity-100">
                            {doc.category}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                         <span className="line-clamp-1">{doc.section_title || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.lang === "en" ? "default" : "secondary"} className="uppercase text-[10px]">
                          {doc.lang || "vi"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                         <div className="truncate max-w-[200px] text-xs">
                             {doc.answer}
                         </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(doc._id); }}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDelete(e, doc._id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
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
             <div className="p-4 flex justify-center border-t bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => loadMore(20)} disabled={qaStatus === "LoadingMore"}>
                    {qaStatus === "LoadingMore" ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading...
                      </>
                    ) : "Load More"}
                </Button>
            </div>
        )}
      </Card>
    </div>
  );
}
