"use client";

import { Leaf, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo } from "react";

export const Footer = memo(function Footer() {
  const t = useTranslations("footer");
  return (
    <footer
      className="bg-foreground py-8 text-background sm:py-12 lg:py-16"
      id="contact"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-1 gap-6 sm:mb-12 sm:grid-cols-2 sm:gap-8 lg:grid-cols-2">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
              <div className="rounded-lg bg-background/10 p-2">
                <Leaf className="h-5 w-5 text-background sm:h-6 sm:w-6" />
              </div>
              <span className="font-bold text-lg sm:text-xl">CarbonLearn</span>
            </div>
            <p className="mb-3 text-background/80 text-xs leading-relaxed sm:mb-4 sm:text-sm">
              {t("brand.description")}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 font-semibold text-base sm:mb-4 sm:text-lg">
              {t("contact.title")}
            </h3>
            <ul className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-background/80 sm:h-5 sm:w-5" />
                <a
                  className="break-all text-background/80 transition-colors hover:text-background"
                  href="mailto:info@carbonlearn.com"
                >
                  Email: anh.ld@vinuni.edu.vn
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-background/80 sm:h-5 sm:w-5" />
                <a
                  className="text-background/80 transition-colors hover:text-background"
                  href="tel:+1234567890"
                >
                  +1 (234) 567-890
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-background/80 sm:h-5 sm:w-5" />
                <span className="text-background/80">
                  VinUniversity, Ocean Park, Gia Lam, Ha Noi
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-background/20 border-t pt-6 text-background/80 text-xs sm:gap-4 sm:pt-8 sm:text-sm md:flex-row">
          <p className="text-center md:text-left">{t("bottom.copyright")}</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link
              className="whitespace-nowrap transition-colors hover:text-background"
              href="#"
            >
              {t("bottom.privacy")}
            </Link>
            <Link
              className="whitespace-nowrap transition-colors hover:text-background"
              href="#"
            >
              {t("bottom.terms")}
            </Link>
            <Link
              className="whitespace-nowrap transition-colors hover:text-background"
              href="#"
            >
              {t("bottom.cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
});
