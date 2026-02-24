"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { memo, useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/lib/navigation";

export const Navigation = memo(function Navigation() {
  const t = useTranslations("navigation");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Don't render until mounted to avoid hydration issues
  if (!isMounted) {
    return null;
  }

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
          ? "bg-background/95 shadow-md backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <Link className="group flex items-center gap-2" href="/">
            <div className="relative h-10 w-10 transition-transform group-hover:scale-110">
              <Image
                alt="CarbonLearn Logo"
                className="rounded-lg object-contain"
                fill
                priority
                sizes="(max-width: 768px) 2.5rem, 2.5rem"
                src="/logo_carbon.jpg"
              />
            </div>
            <span className="font-bold text-foreground text-xl">
              {t("brand")}
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex lg:gap-8">
            <Link
              className="text-foreground transition-colors hover:text-primary"
              href="/#book"
            >
              {t("recommendedBook")}
            </Link>
            <Link
              className="text-foreground transition-colors hover:text-primary"
              data-tour="nav-books"
              href="/books"
            >
              {t("books")}
            </Link>
            <Link
              className="text-foreground transition-colors hover:text-primary"
              data-tour="nav-search"
              href="/search"
            >
              {t("search")}
            </Link>
            <Link
              className="text-foreground transition-colors hover:text-primary"
              data-tour="nav-ask-ai"
              href="/ask-ai"
            >
              {t("askAI")}
            </Link>
            <Link
              className="text-foreground transition-colors hover:text-primary"
              data-tour="nav-about"
              href="/about-us"
            >
              {t("about")}
            </Link>
            <Link
              className="text-foreground transition-colors hover:text-primary"
              href="/#common"
            >
              {t("commonQuestions")}
            </Link>
            <Link
              className="text-foreground transition-colors hover:text-primary"
              href="/#contact"
            >
              {t("contact")}
            </Link>
            <LocaleSwitcher />
          </div>

          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <LocaleSwitcher />
            </div>
            <button
              aria-expanded={isMobileMenuOpen}
              aria-label={
                isMobileMenuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              className="rounded text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 md:hidden"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-border border-t py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <Link
                className="text-foreground transition-colors hover:text-primary"
                href="/#book"
                onClick={closeMobileMenu}
              >
                {t("recommendedBook")}
              </Link>
              <Link
                className="text-foreground transition-colors hover:text-primary"
                href="/books"
                onClick={closeMobileMenu}
              >
                {t("books")}
              </Link>
              <Link
                className="text-foreground transition-colors hover:text-primary"
                href="/search"
                onClick={closeMobileMenu}
              >
                {t("search")}
              </Link>
              <Link
                className="text-foreground transition-colors hover:text-primary"
                href="/ask-ai"
                onClick={closeMobileMenu}
              >
                {t("askAI")}
              </Link>
              <Link
                className="text-foreground transition-colors hover:text-primary"
                href="/about-us"
                onClick={closeMobileMenu}
              >
                {t("about")}
              </Link>
              <Link
                className="text-foreground transition-colors hover:text-primary"
                href="/#common"
                onClick={closeMobileMenu}
              >
                {t("commonQuestions")}
              </Link>
              <Link
                className="text-foreground transition-colors hover:text-primary"
                href="/#contact"
                onClick={closeMobileMenu}
              >
                {t("contact")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});
