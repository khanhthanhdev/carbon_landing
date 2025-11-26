import type { Metadata } from "next";

export type SupportedLocale = "en" | "vi";
export type PageKey = "home" | "search" | "books" | "askAi" | "aboutUs" | "faqs";

const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "vi"];
const DEFAULT_LOCALE: SupportedLocale = "vi";
const SITE_NAME = "CarbonLearn";
const DEFAULT_SITE_URL = "https://www.carbonmarketvietnam.com";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

const routePath: Record<PageKey, string> = {
  home: "",
  search: "/search",
  books: "/books",
  askAi: "/ask-ai",
  aboutUs: "/about-us",
  faqs: "/faqs",
};

const openGraphImages: Record<PageKey, string> = {
  home: "/lush-green-forest-canopy-aerial-view-sustainabilit.jpg",
  search: "/carbon-markets-book-cover-with-green-leaf-design.jpg",
  books: "/book-cover-carbon-markets.jpg",
  askAi: "/diverse-business-professionals-learning-sustainabi.jpg",
  aboutUs: "/lush-green-forest-canopy-aerial-view-sustainabilit.jpg",
  faqs: "/carbon-markets-book-cover-with-green-leaf-design.jpg",
};

function resolveAssetPath(path: string) {
  const normalizedSiteUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  return new URL(path, normalizedSiteUrl).toString();
}

const titles: Record<PageKey, Record<SupportedLocale, string>> = {
  home: {
    en: "Carbon Market Training for Vietnamese SMEs",
    vi: "Bộ câu hỏi về thị trường carbon dành cho doanh nghiệp SME",
  },
  search: {
    en: "Search the Carbon Knowledge Base",
    vi: "Tìm kiếm thư viện kiến thức thị trường carbon",
  },
  books: {
    en: "Carbon Market Playbook & Learning Paths",
    vi: "Cẩm nang thị trường carbon và lộ trình học",
  },
  askAi: {
  en: "AI Advisor",
  vi: "Trợ lý AI giải đáp về thị trường carbon",
  },
  aboutUs: {
  en: "About Us",
  vi: "Về chúng tôi",
  },
  faqs: {
  en: "Frequently Asked Questions",
  vi: "Câu hỏi thường gặp",
  },
};

const descriptions: Record<PageKey, Record<SupportedLocale, string>> = {
  home: {
  en: "Understand carbon credits, compliance, and opportunity pathways tailored for Vietnamese SMEs to thrive in the carbon market.",
  vi: "Nắm vững tín chỉ carbon, yêu cầu bắt buộc và cơ hội kinh doanh giúp doanh nghiệp SME Việt Nam tham gia hiệu quả vào thị trường carbon.",
  },
  search: {
  en: "Explore verified answers about carbon credits, reporting, pricing and policies curated for small and medium enterprises.",
  vi: "Khám phá câu trả lời chuẩn xác về tín chỉ carbon, báo cáo phát thải, giá cả và chính sách dành cho doanh nghiệp nhỏ và vừa.",
  },
  books: {
  en: "Dive into structured lessons, policy explainers, and case studies that demystify Vietnam’s carbon market.",
  vi: "Tiếp cận bài học, phân tích chính sách và tình huống thực tế giúp bạn hiểu rõ thị trường carbon tại Việt Nam.",
  },
  askAi: {
  en: "Chat with an AI mentor trained on Vietnam's carbon regulations and SME best practices.",
  vi: "Trò chuyện với trợ lý AI am hiểu quy định carbon của Việt Nam và kinh nghiệm triển khai cho SME.",
  },
  aboutUs: {
  en: "Meet the expert team behind CarbonLearn's comprehensive carbon market training and resources for Vietnamese SMEs.",
  vi: "Gặp gỡ đội ngũ chuyên gia đằng sau chương trình đào tạo và tài nguyên toàn diện về thị trường carbon của CarbonLearn dành cho doanh nghiệp SME Việt Nam.",
  },
  faqs: {
  en: "Find answers to common questions about carbon markets, credits, and compliance for Vietnamese SMEs.",
  vi: "Tìm câu trả lời cho các câu hỏi thường gặp về thị trường carbon, tín chỉ carbon dành cho doanh nghiệp SME Việt Nam.",
  },
};

const keywordSet: Record<SupportedLocale, string[]> = {
  en: [
    "carbon",
    "carbon credits",
    "carbon market",
    "SME",
    "small and medium enterprises",
    "Vietnam carbon market",
    "carbon training",
    "net zero roadmap",
    "climate change",
    "sustainability",
    "greenhouse gas emissions",
    "Vietnam ETS",
    "emission rights",
    "emission reduction",
    "Vietnam net zero",
    "CO2 emissions",
    "emission trading scheme",
    "carbon footprint",
    "Vietnam emission reporting",
    "carbon credit pricing",
    "Vietnam climate policy",
  ],
  vi: [
    "carbon",
    "tín chỉ carbon",
    "thị trường carbon",
    "SME",
    "doanh nghiệp nhỏ và vừa",
    "thị trường carbon Việt Nam",
    "tín chỉ carbon Việt Nam",
    "doanh nghiệp SME Việt Nam",
    "đào tạo carbon",
    "lộ trình net zero",
    "quản lý phát thải",
    "báo cáo phát thải",
    "giá carbon",
    "chính sách carbon",
    "net zero",
    "phát thải carbon",
    "biến đổi khí hậu",
    "bền vững",
    "khí thải nhà kính",
    "ETS Việt Nam",
    "quyền phát thải",
    "giảm phát thải",
    "net zero Việt Nam",
    "phát thải CO2",
    "thị trường trao đổi quyền phát thải",
    "carbon footprint",
    "báo cáo phát thải Việt Nam",
    "giá tín chỉ carbon",
    "chính sách khí hậu Việt Nam",
  ],
};

const openGraphLocaleMap: Record<SupportedLocale, string> = {
  en: "en_US",
  vi: "vi_VN",
};

function resolveLocale(locale?: string): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE;
  return (SUPPORTED_LOCALES.find((item) => item === locale) ?? DEFAULT_LOCALE) as SupportedLocale;
}

function getAlternateLinks(pathname: string) {
  const normalised = pathname.startsWith("/") ? pathname : `/${pathname}`;

  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => {
      const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
      return [locale, `${prefix}${normalised === "/" ? "" : normalised}` || "/"];
    }),
  );

  return {
    languages,
  };
}

export function getAlternateLinksForLayout(pathname: string, currentLocale?: string) {
  const normalised = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const baseUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const locale = resolveLocale(currentLocale);

  // Determine canonical URL for the current locale
  const currentLocalePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const canonicalPath = `${currentLocalePrefix}${normalised === "/" ? "" : normalised}` || "/";
  const canonical = new URL(canonicalPath.replace(/^\//, ""), baseUrl).toString();

  // Generate hreflang links for all locales
  const hreflang = SUPPORTED_LOCALES.map((loc) => {
    const prefix = loc === DEFAULT_LOCALE ? "" : `/${loc}`;
    const path = `${prefix}${normalised === "/" ? "" : normalised}` || "/";
    const href = new URL(path.replace(/^\//, ""), baseUrl).toString();
    const hrefLang = loc === "vi" ? "vi-VN" : loc === "en" ? "en-US" : loc;
    return { href, hrefLang };
  });

  // Add x-default pointing to default locale version
  const defaultLocalePath = normalised === "/" ? "" : normalised;
  const xDefaultHref = new URL(defaultLocalePath.replace(/^\//, ""), baseUrl).toString();
  hreflang.push({
    href: xDefaultHref,
    hrefLang: "x-default",
  });

  return { canonical, hreflang };
}

function buildOpenGraph(page: PageKey, locale: SupportedLocale, pathname: string): Metadata["openGraph"] {
  const baseUrl = new URL(pathname.replace(/^\/*/, ""), siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`);
  const alternateLocale = SUPPORTED_LOCALES.filter((item) => item !== locale).map(
    (item) => openGraphLocaleMap[item],
  );

    return {
      type: "website",
      locale: openGraphLocaleMap[locale],
      alternateLocale,
      url: baseUrl,
      title: `${titles[page][locale]} | ${SITE_NAME}`,
      description: descriptions[page][locale],
      siteName: SITE_NAME,
      images: [
        {
          url: resolveAssetPath(openGraphImages[page]),
          alt: titles[page][locale],
        },
      ],
    };
}

export function buildStructuredData(page: PageKey, locale: SupportedLocale, canonicalPath: string) {
  const baseUrl = new URL(canonicalPath.replace(/^\/*/, ""), siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`);

  // Organization schema (always included)
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo_carbon.jpg`,
    image: `${siteUrl}/logo_carbon.jpg`,
    description: locale === "vi"
      ? "Nền tảng đào tạo toàn diện về thị trường carbon dành cho doanh nghiệp SME Việt Nam"
      : "Comprehensive carbon market training platform for Vietnamese SMEs",
    foundingDate: "2024",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `${siteUrl}/about-us`,
      availableLanguage: ["vi", "en"],
    },
    sameAs: [
      // Add social media profiles when available
    ],
    knowsAbout: [
      "Carbon Credits",
      "Carbon Market",
      "SME Training",
      "Vietnam Carbon Policy",
      "Emission Trading",
      "Climate Change",
      "Sustainability",
      "Net Zero Roadmap"
    ],
    areaServed: {
      "@type": "Country",
      name: "Vietnam"
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: locale === "vi" ? "Đào tạo thị trường carbon" : "Carbon Market Training",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Course",
            name: locale === "vi" ? "Cẩm nang thị trường carbon" : "Carbon Market Playbook",
            description: locale === "vi"
              ? "Khóa học toàn diện về thị trường carbon cho doanh nghiệp SME"
              : "Comprehensive carbon market course for SMEs"
          }
        }
      ]
    }
  };

  // Website schema
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: descriptions[page][locale],
    inLanguage: locale === "vi" ? "vi-VN" : "en-US",
    copyrightHolder: {
      "@type": "Organization",
      name: "VinUni & British Council"
    },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/${locale}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      },
      {
        "@type": "CommunicateAction",
        target: `${siteUrl}/${locale}/ask-ai`
      }
    ],
    publisher: {
      "@type": "Organization",
      name: "VinUni & British Council",
      url: "https://vinuni.edu.vn"
    }
  };

  // Breadcrumb schema for navigation
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "vi" ? "Trang chủ" : "Home",
        item: siteUrl
      },
      {
        "@type": "ListItem",
        position: 2,
        name: titles[page][locale],
        item: baseUrl.toString()
      }
    ]
  };

  // Page-specific structured data
  let pageSpecificData = {};

  if (page === "home") {
    pageSpecificData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: titles[page][locale],
      description: descriptions[page][locale],
      url: baseUrl.toString(),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl,
      },
      about: [
        {
          "@type": "Thing",
          name: "Carbon Market",
          description: locale === "vi"
            ? "Thị trường trao đổi quyền phát thải carbon tại Việt Nam"
            : "Carbon emission trading market in Vietnam",
        },
        {
          "@type": "Thing",
          name: "SME Training",
          description: locale === "vi"
            ? "Đào tạo doanh nghiệp nhỏ và vừa về thị trường carbon"
            : "Small and medium enterprise training on carbon markets"
        }
      ],
      mainEntity: {
        "@type": "EducationalOrganization",
        name: "CarbonLearn",
        description: descriptions[page][locale],
        educationalCredentialAwarded: locale === "vi" ? "Chứng chỉ đào tạo carbon" : "Carbon Training Certificate",
        hasEducationalUse: "Professional Training",
        teaches: [
          "Carbon Credits",
          "Emission Reporting",
          "Carbon Pricing",
          "Vietnam ETS",
          "Net Zero Strategies"
        ]
      },
      // Add FAQ schema for common questions
      mainEntityOfPage: {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: locale === "vi" ? "Thị trường carbon là gì?" : "What is the carbon market?",
            acceptedAnswer: {
              "@type": "Answer",
              text: locale === "vi"
                ? "Thị trường carbon là nơi trao đổi quyền phát thải carbon dioxide và các khí nhà kính khác."
                : "The carbon market is a marketplace for trading carbon dioxide and other greenhouse gas emission rights."
            }
          },
          {
            "@type": "Question",
            name: locale === "vi" ? "Doanh nghiệp SME có thể tham gia như thế nào?" : "How can SMEs participate?",
            acceptedAnswer: {
              "@type": "Answer",
              text: locale === "vi"
                ? "Doanh nghiệp SME có thể tham gia thông qua việc giảm phát thải, mua tín chỉ carbon, và tuân thủ quy định báo cáo."
                : "SMEs can participate through emission reduction activities, purchasing carbon credits, and compliance reporting."
            }
          }
        ]
      }
    };
  } else if (page === "books") {
    pageSpecificData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: titles[page][locale],
      description: descriptions[page][locale],
      url: baseUrl.toString(),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl,
      },
      mainEntity: {
        "@type": "Course",
        name: titles[page][locale],
        description: descriptions[page][locale],
        provider: {
          "@type": "Organization",
          name: "VinUni & British Council",
          url: "https://vinuni.edu.vn"
        },
        courseMode: "online",
        inLanguage: locale === "vi" ? "vi-VN" : "en-US",
        educationalCredentialAwarded: locale === "vi" ? "Chứng chỉ hoàn thành" : "Completion Certificate",
        teaches: [
          "Carbon Market Fundamentals",
          "Vietnam Carbon Policy",
          "Emission Trading Systems",
          "Carbon Credit Verification",
          "SME Implementation Strategies"
        ],
        coursePrerequisites: locale === "vi"
          ? "Kiến thức cơ bản về kinh doanh và phát triển bền vững"
          : "Basic business knowledge and sustainability awareness",
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "50"
        }
      },
    };
  } else if (page === "search") {
    pageSpecificData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: titles[page][locale],
      description: descriptions[page][locale],
      url: baseUrl.toString(),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl,
      },
      mainEntity: {
        "@type": "SearchResultsPage",
        about: {
          "@type": "Thing",
          name: "Carbon Market Knowledge Base"
        }
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${baseUrl}?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };
  } else if (page === "askAi") {
    pageSpecificData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: titles[page][locale],
      description: descriptions[page][locale],
      url: baseUrl.toString(),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl,
      },
      mainEntity: {
        "@type": "SoftwareApplication",
        name: "AI Carbon Advisor",
        description: descriptions[page][locale],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web Browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD"
        }
      }
    };
  } else if (page === "aboutUs") {
    pageSpecificData = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: titles[page][locale],
      description: descriptions[page][locale],
      url: baseUrl.toString(),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl,
      },
      mainEntity: {
        "@type": "EducationalOrganization",
        name: SITE_NAME,
        description: descriptions[page][locale],
        url: siteUrl,
        logo: `${siteUrl}/logo_carbon.jpg`,
        founder: [
          {
            "@type": "Person",
            name: "Dr. Lê Duy Anh",
            jobTitle: locale === "vi" ? "Giám đốc chương trình, Giảng Viên" : "Program Director, Lecturer",
            affiliation: {
              "@type": "Organization",
              name: "VinUniversity"
            }
          },
          {
            "@type": "Person",
            name: "Assoc. Prof. Dr. Vũ Anh Dũng",
            jobTitle: locale === "vi" ? "Viện trưởng sáng lập Viện Khoa học và Giáo dục Khai phóng" : "Founding Dean, College of Arts and Sciences",
            affiliation: {
              "@type": "Organization",
              name: "VinUniversity"
            }
          },
          {
            "@type": "Person",
            name: "Dr. Trương Thu Hà",
            jobTitle: locale === "vi" ? "Giảng viên Bộ môn Chính sách công" : "Lecturer, Department of Public Policy",
            affiliation: {
              "@type": "Organization",
              name: locale === "vi" ? "Đại học Quốc gia Hà Nội" : "Vietnam National University, Hanoi"
            }
          }
        ],
        member: [
          {
            "@type": "Organization",
            name: "VinUniversity",
            url: "https://vinuni.edu.vn"
          },
          {
            "@type": "Organization",
            name: "British Council",
            url: "https://www.britishcouncil.vn"
          }
        ],
        knowsAbout: [
          "Carbon Markets",
          "SME Training",
          "Sustainability",
          "Vietnam Carbon Policy"
        ]
      }
    };
  }

  return [organizationData, websiteData, breadcrumbData, pageSpecificData].filter(item => Object.keys(item).length > 1);
}

export function buildPageMetadata(page: PageKey, localeInput?: string): Metadata {
  const locale = resolveLocale(localeInput);
  const pathname = routePath[page] || "";
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const canonicalPath = `${localePrefix}${pathname}` || "/";

  const structuredData = buildStructuredData(page, locale, canonicalPath);

  return {
    metadataBase: new URL(siteUrl),
    applicationName: SITE_NAME,
    generator: "VinUni & British Council",
    authors: [
      {
        name: "CarbonLearn Team",
      },
      {
        name: "VinUni",
      },
      {
        name: "British Council",
      },
    ],
    creator: "VinUni & British Council",
    publisher: "VinUni & British Council",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    title: {
      default: `${titles[page][locale]} | ${SITE_NAME}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: descriptions[page][locale],
    keywords: keywordSet[locale],
    alternates: {
      canonical: canonicalPath,
      ...getAlternateLinks(pathname),
    },
    openGraph: buildOpenGraph(page, locale, canonicalPath),
    twitter: {
      card: "summary_large_image",
      site: "@carbonlearn", // Add when available
      creator: "@vinuni", // Add when available
      title: `${titles[page][locale]} | ${SITE_NAME}`,
      description: descriptions[page][locale],
      images: [
        {
          url: resolveAssetPath(openGraphImages[page]),
          alt: titles[page][locale],
          width: 1200,
          height: 630,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    category: locale === "vi" ? "Thị trường carbon" : "Carbon Market",
    classification: "Education, Training, Environment, Sustainability",
    other: {
      'msapplication-TileColor': '#000000',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'apple-mobile-web-app-title': SITE_NAME,
      'application-name': SITE_NAME,
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || '',
    },
  };
}

export function getPageStructuredData(page: PageKey, localeInput?: string): object[] {
  const locale = resolveLocale(localeInput);
  const pathname = routePath[page] || "";
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const canonicalPath = `${localePrefix}${pathname}` || "/";

  return buildStructuredData(page, locale, canonicalPath);
}
