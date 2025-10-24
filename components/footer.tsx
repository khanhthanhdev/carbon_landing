"use client"

import { Leaf, Mail, Phone, MapPin, Facebook, Linkedin } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo } from "react";

export const Footer = memo(function Footer() {
  const t = useTranslations('footer')
  return (
    <footer className="bg-foreground text-background py-8 sm:py-12 lg:py-16" id="contact">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="bg-background/10 rounded-lg p-2">
                <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-background" />
              </div>
              <span className="text-lg sm:text-xl font-bold">CarbonLearn</span>
            </div>
            <p className="text-background/80 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
              {t('brand.description')}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">{t('contact.title')}</h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5 text-background/80" />
                <a
                  href="mailto:info@carbonlearn.com"
                  className="text-background/80 hover:text-background transition-colors break-all"
                >
                  Email: anh.ld@vinuni.edu.vn
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5 text-background/80" />
                <a href="tel:+1234567890" className="text-background/80 hover:text-background transition-colors">
                  +1 (234) 567-890
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5 text-background/80" />
                <span className="text-background/80">VinUniversity, Ocean Park, Gia Lam, Ha Noi</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-background/80">
          <p className="text-center md:text-left">{t('bottom.copyright')}</p>
          <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
            <Link href="#" className="hover:text-background transition-colors whitespace-nowrap">
              {t('bottom.privacy')}
            </Link>
            <Link href="#" className="hover:text-background transition-colors whitespace-nowrap">
              {t('bottom.terms')}
            </Link>
            <Link href="#" className="hover:text-background transition-colors whitespace-nowrap">
              {t('bottom.cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
})
