"use client";

import { SignInButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Loader2 } from "lucide-react";
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Authenticated>
        <AdminOnly fallback={null}>
          <div className="z-10 hidden shadow-md md:block">
            <AdminSidebarNav />
          </div>
        </AdminOnly>
      </Authenticated>

      <div className="flex flex-1 flex-col overflow-hidden">
        <AuthLoading>
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Loading authentication...</p>
            </div>
          </div>
        </AuthLoading>

        <Unauthenticated>
          <div className="flex h-full items-center justify-center p-8">
            <Card className="mx-auto max-w-md border-amber-200/50 bg-amber-50/30">
              <CardContent className="flex flex-col items-center justify-center space-y-6 py-12 sm:py-16">
                <div className="space-y-2 text-center">
                  <p className="font-medium text-lg">Sign in required</p>
                  <p className="text-muted-foreground text-sm">
                    You need to sign in to access the admin dashboard.
                  </p>
                </div>
                <SignInButton mode="modal">
                  <Button size="lg">Sign In</Button>
                </SignInButton>
                <p className="max-w-xs text-center text-muted-foreground text-xs">
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
              <div className="flex h-full items-center justify-center p-8">
                <Card className="max-w-md border-destructive/30 bg-destructive/5">
                  <CardContent className="py-8">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                        <span className="text-lg">🔒</span>
                      </div>
                      <div>
                        <p className="font-semibold text-destructive">
                          Access Denied
                        </p>
                        <p className="mt-1 text-destructive/80 text-sm">
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
