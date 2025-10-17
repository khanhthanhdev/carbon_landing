"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Leaf, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function Navigation() {
  const t = useTranslations("navigation");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen ? "bg-background/95 backdrop-blur-md shadow-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary rounded-lg p-2 group-hover:scale-110 transition-transform">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{t("brand")}</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="/#book" className="text-foreground hover:text-primary transition-colors">
              {t("recommendedBook")}
            </Link>
            <Link href="/books" className="text-foreground hover:text-primary transition-colors">
              {t("books")}
            </Link>
            <Link href="/search" className="text-foreground hover:text-primary transition-colors">
              {t("search")}
            </Link>
            <Link href="/ask-ai" className="text-foreground hover:text-primary transition-colors">
              {t("askAI")}
            </Link>
            <Link href="/about-us" className="text-foreground hover:text-primary transition-colors">
              {t("about")}
            </Link>
            <Link href="/#common" className="text-foreground hover:text-primary transition-colors">
              {t("commonQuestions")}
            </Link>
            <Link href="/#contact" className="text-foreground hover:text-primary transition-colors">
              {t("contact")}
            </Link>
            <LocaleSwitcher />
          </div>

          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <LocaleSwitcher />
            </div>
            <button className="md:hidden text-foreground" onClick={() => setIsMobileMenuOpen((open) => !open)}>
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <Link href="/#book" className="text-foreground hover:text-primary transition-colors" onClick={closeMobileMenu}>
                {t("recommendedBook")}
              </Link>
              <Link href="/books" className="text-foreground hover:text-primary transition-colors" onClick={closeMobileMenu}>
                {t("books")}
              </Link>
              <Link href="/search" className="text-foreground hover:text-primary transition-colors" onClick={closeMobileMenu}>
                {t("search")}
              </Link>
              <Link href="/ask-ai" className="text-foreground hover:text-primary transition-colors" onClick={closeMobileMenu}>
                {t("askAI")}
              </Link>
              <Link href="/about-us" className="text-foreground hover:text-primary transition-colors" onClick={closeMobileMenu}>
                {t("about")}
              </Link>
              <Link href="/#common" className="text-foreground hover:text-primary transition-colors" onClick={closeMobileMenu}>
                {t("commonQuestions")}
              </Link>
              <Link href="/#contact" className="text-foreground hover:text-primary transition-colors" onClick={closeMobileMenu}>
                {t("contact")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
