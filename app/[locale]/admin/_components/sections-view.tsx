"use client";

import { useMutation, useQuery } from "convex/react";
import { Edit2, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export function SectionsView() {
  const sections = useQuery(api.sections.list, {}) ?? [];
  const createSection = useMutation(api.sections.create);
  const updateSection = useMutation(api.sections.update);
  const deleteSection = useMutation(api.sections.remove);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Doc<"sections"> | null>(
    null
  );

  // Form State
  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [order, setOrder] = useState<number>(0);
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const handleOpenCreate = () => {
    setEditingSection(null);
    setNameVi("");
    setNameEn("");
    setSlug("");
    setOrder(sections.length + 1);
    setDescription("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (section: Doc<"sections">) => {
    setEditingSection(section);
    setNameVi(section.name_vi);
    setNameEn(section.name_en ?? "");
    setSlug(section.slug);
    setOrder(section.order);
    setDescription(section.description ?? "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!nameVi) {
      toast({ title: "Vietnamese Name is required", variant: "destructive" });
      return;
    }
    if (!slug) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSection) {
        await updateSection({
          id: editingSection._id,
          name_vi: nameVi,
          name_en: nameEn || undefined,
          slug,
          order,
          description: description || undefined,
        });
        toast({ title: "Section updated" });
      } else {
        await createSection({
          name_vi: nameVi,
          name_en: nameEn || undefined,
          slug,
          order,
          description: description || undefined,
        });
        toast({ title: "Section created" });
      }
      setIsDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"sections">) => {
    if (!confirm("Are you sure? This will delete the section.")) {
      return;
    }
    try {
      await deleteSection({ id });
      toast({ title: "Section deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Sections</h1>
          <p className="text-muted-foreground">
            Manage content sections (Vietnamese & English).
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="w-[200px]">Name (VI)</TableHead>
              <TableHead className="w-[200px]">Name (EN)</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No sections found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              sections.map((section) => (
                <TableRow key={section._id}>
                  <TableCell className="font-mono text-xs">
                    {section.order}
                  </TableCell>
                  <TableCell className="font-medium">
                    {section.name_vi}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {section.name_en || "-"}
                  </TableCell>
                  <TableCell className="mt-2 inline-block rounded bg-muted px-2 py-1 font-mono text-muted-foreground text-xs">
                    {section.slug}
                  </TableCell>
                  <TableCell
                    className="max-w-xs truncate text-muted-foreground"
                    title={section.description}
                  >
                    {section.description}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8" size="icon" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(section)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(section._id)}
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

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Edit Section" : "Create Section"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_vi">
                  Name (Vietnamese) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name_vi"
                  onChange={(e) => setNameVi(e.target.value)}
                  placeholder="e.g. Giới thiệu chung"
                  value={nameVi}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_en">Name (English)</Label>
                <Input
                  id="name_en"
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. General Introduction"
                  value={nameEn}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. general-introduction"
                  value={slug}
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  onChange={(e) =>
                    setOrder(Number.parseInt(e.target.value, 10) || 0)
                  }
                  type="number"
                  value={order}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                value={description}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => setIsDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
