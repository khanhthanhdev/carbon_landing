"use client";

import { SignInButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
} from "convex/react";
import { AdminOnly } from "@/components/admin-only";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminSidebarNav } from "./_components/admin-sidebar-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
        <Authenticated>
            <AdminOnly fallback={null}>
                 <div className="hidden md:block shadow-md z-10">
                    <AdminSidebarNav />
                 </div>
            </AdminOnly>
        </Authenticated>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AuthLoading>
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Loading authentication...</p>
            </div>
          </div>
        </AuthLoading>

        <Unauthenticated>
          <div className="flex items-center justify-center h-full p-8">
            <Card className="border-amber-200/50 bg-amber-50/30 max-w-md mx-auto">
              <CardContent className="flex flex-col items-center justify-center space-y-6 py-12 sm:py-16">
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">Sign in required</p>
                  <p className="text-sm text-muted-foreground">
                    You need to sign in to access the admin dashboard.
                  </p>
                </div>
                <SignInButton mode="modal">
                  <Button size="lg">Sign In</Button>
                </SignInButton>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Note: Sign-up is disabled. Only the configured admin can sign
                  in.
                </p>
              </CardContent>
            </Card>
          </div>
        </Unauthenticated>

        <Authenticated>
          <AdminOnly
            fallback={
              <div className="flex items-center justify-center h-full p-8">
                <Card className="border-destructive/30 bg-destructive/5 max-w-md">
                  <CardContent className="py-8">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <span className="text-lg">🔒</span>
                      </div>
                      <div>
                        <p className="font-semibold text-destructive">
                          Access Denied
                        </p>
                        <p className="text-sm text-destructive/80 mt-1">
                          You must be an admin to view this page.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            }
          >
            {/* View Content */}
            <div className="flex-1 overflow-auto bg-slate-50/50">
               {children}
            </div>
          </AdminOnly>
        </Authenticated>
      </div>
    </div>
  );
}
