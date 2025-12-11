"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, FileQuestion, MessageSquare } from "lucide-react";

export function AdminSidebarNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname?.includes(path);
  };

  return (
    <nav className="w-64 bg-slate-50 border-r min-h-screen p-4 flex flex-col gap-2">
      <div className="font-bold text-lg px-4 py-2 text-slate-700 mb-4">Admin</div>
      
      <Link href="/admin/sections">
        <Button
          variant={isActive("/admin/sections") ? "secondary" : "ghost"}
          className={cn("w-full justify-start gap-2", isActive("/admin/sections") && "bg-slate-200")}
        >
          <BookOpen className="h-4 w-4" />
          Sections
        </Button>
      </Link>
      
      <Link href="/admin/questions">
        <Button
          variant={isActive("/admin/questions") ? "secondary" : "ghost"}
          className={cn("w-full justify-start gap-2", isActive("/admin/questions") && "bg-slate-200")}
        >
          <FileQuestion className="h-4 w-4" />
          Questions
        </Button>
      </Link>

      <Link href="/admin/feedback">
        <Button
          variant={isActive("/admin/feedback") ? "secondary" : "ghost"}
          className={cn("w-full justify-start gap-2", isActive("/admin/feedback") && "bg-slate-200")}
        >
          <MessageSquare className="h-4 w-4" />
          Feedback
        </Button>
      </Link>
    </nav>
  );
}
