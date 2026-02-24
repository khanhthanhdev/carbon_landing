"use client";

import { BookOpen, FileQuestion, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminSidebarNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname?.includes(path);
  };

  return (
    <nav className="flex min-h-screen w-64 flex-col gap-2 border-r bg-slate-50 p-4">
      <div className="mb-4 px-4 py-2 font-bold text-lg text-slate-700">
        Admin
      </div>

      <Link href="/admin/sections">
        <Button
          className={cn(
            "w-full justify-start gap-2",
            isActive("/admin/sections") && "bg-slate-200"
          )}
          variant={isActive("/admin/sections") ? "secondary" : "ghost"}
        >
          <BookOpen className="h-4 w-4" />
          Sections
        </Button>
      </Link>

      <Link href="/admin/questions">
        <Button
          className={cn(
            "w-full justify-start gap-2",
            isActive("/admin/questions") && "bg-slate-200"
          )}
          variant={isActive("/admin/questions") ? "secondary" : "ghost"}
        >
          <FileQuestion className="h-4 w-4" />
          Questions
        </Button>
      </Link>

      <Link href="/admin/feedback">
        <Button
          className={cn(
            "w-full justify-start gap-2",
            isActive("/admin/feedback") && "bg-slate-200"
          )}
          variant={isActive("/admin/feedback") ? "secondary" : "ghost"}
        >
          <MessageSquare className="h-4 w-4" />
          Feedback
        </Button>
      </Link>
    </nav>
  );
}
