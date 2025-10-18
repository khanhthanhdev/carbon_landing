import type { Metadata } from "next";

type SupportedLocale = "en" | "vi";
type PageKey = "home" | "search" | "books" | "askAi" | "aboutUs";

const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "vi"];
const DEFAULT_LOCALE: SupportedLocale = "vi";
const SITE_NAME = "CarbonLearn";
const DEFAULT_SITE_URL = "https://carbonmarketvietnam.com";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

const routePath: Record<PageKey, string> = {
  home: "",
  search: "/search",
  books: "/books",
  askAi: "/ask-ai",
  aboutUs: "/about-us",
};

const openGraphImages: Record<PageKey, string> = {
  home: "/lush-green-forest-canopy-aerial-view-sustainabilit.jpg",
  search: "/carbon-markets-book-cover-with-green-leaf-design.jpg",
  books: "/book-cover-carbon-markets.jpg",
  askAi: "/diverse-business-professionals-learning-sustainabi.jpg",
  aboutUs: "/lush-green-forest-canopy-aerial-view-sustainabilit.jpg",
};

const titles: Record<PageKey, Record<SupportedLocale, string>> = {
  home: {
    en: "Carbon Market Training for Vietnamese SMEs",
    vi: "Đào tạo thị trường carbon dành cho doanh nghiệp SME",
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
};

const descriptions: Record<PageKey, Record<SupportedLocale, string>> = {
  home: {
  en: "Understand carbon credits, compliance, and opportunity pathways tailored for Vietnamese SMEs to thrive in the carbon market.",
  vi: "Nắm vững tín chỉ carbon, yêu cầu tuân thủ và cơ hội kinh doanh giúp doanh nghiệp SME Việt Nam tham gia hiệu quả vào thị trường carbon.",
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
        url: openGraphImages[page],
        alt: titles[page][locale],
      },
    ],
  };
}

function buildStructuredData(page: PageKey, locale: SupportedLocale, canonicalPath: string) {
  const baseUrl = new URL(canonicalPath.replace(/^\/*/, ""), siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`);

  // Organization schema (always included)
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`, // Add your logo path
    description: locale === "vi"
      ? "Nền tảng đào tạo toàn diện về thị trường carbon dành cho doanh nghiệp SME Việt Nam"
      : "Comprehensive carbon market training platform for Vietnamese SMEs",
    foundingDate: "2024", // Update with actual founding date
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `${siteUrl}/contact`, // Add if you have a contact page
    },
    sameAs: [
      // Add your social media profiles
      // "https://facebook.com/yourpage",
      // "https://linkedin.com/company/yourcompany"
    ],
  };

  // Website schema
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: descriptions[page][locale],
    inLanguage: locale === "vi" ? "vi-VN" : "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
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
      about: {
        "@type": "Thing",
        name: "Carbon Market",
        description: locale === "vi"
          ? "Thị trường trao đổi quyền phát thải carbon"
          : "Carbon emission trading market",
      },
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
        },
        courseMode: "online",
        inLanguage: locale === "vi" ? "vi-VN" : "en-US",
      },
    };
  }

  return [organizationData, websiteData, pageSpecificData].filter(item => Object.keys(item).length > 1);
}

export function buildPageMetadata(page: PageKey, localeInput?: string): Metadata {
  const locale = resolveLocale(localeInput);
  const pathname = routePath[page] || "";
  const canonicalPath =
    locale === DEFAULT_LOCALE && pathname === ""
      ? "/"
      : `/${locale}${pathname === "" ? "" : pathname}`;

  const structuredData = buildStructuredData(page, locale, canonicalPath);

  return {
    metadataBase: new URL(siteUrl),
    applicationName: SITE_NAME,
    generator: "VinUni & British Council",
    authors: [
      {
        name: "CarbonLearn Team",
      },
    ],
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
      title: `${titles[page][locale]} | ${SITE_NAME}`,
      description: descriptions[page][locale],
      images: [openGraphImages[page]],
    },
    robots: {
      index: true,
      follow: true,
    },
    category: locale === "vi" ? "Thị trường carbon" : "Carbon Market",
    other: {
      'script:ld+json': JSON.stringify(structuredData),
    },
  };
}
