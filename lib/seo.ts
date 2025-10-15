import type { Metadata } from "next";

type SupportedLocale = "en" | "vi";
type PageKey = "home" | "search" | "books" | "askAi";

const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "vi"];
const DEFAULT_LOCALE: SupportedLocale = "vi";
const SITE_NAME = "CarbonLearn";
const DEFAULT_SITE_URL = "https://thitruongcarbon.vercel.app";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

const routePath: Record<PageKey, string> = {
  home: "",
  search: "/search",
  books: "/books",
  askAi: "/ask-ai",
};

const openGraphImages: Record<PageKey, string> = {
  home: "/lush-green-forest-canopy-aerial-view-sustainabilit.jpg",
  search: "/carbon-markets-book-cover-with-green-leaf-design.jpg",
  books: "/book-cover-carbon-markets.jpg",
  askAi: "/diverse-business-professionals-learning-sustainabi.jpg",
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
    en: "Ask the Carbon AI Advisor",
    vi: "Trợ lý AI giải đáp về thị trường carbon",
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
    en: "Chat with an AI mentor trained on Vietnam’s carbon regulations and SME best practices.",
    vi: "Trò chuyện với trợ lý AI am hiểu quy định carbon của Việt Nam và kinh nghiệm triển khai cho SME.",
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
  ],
  vi: [
    "carbon",
    "tín chỉ carbon",
    "thị trường carbon",
    "SME",
    "doanh nghiệp nhỏ và vừa",
    "đào tạo carbon",
    "lộ trình net zero",
    "quản lý phát thải",
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

export function buildPageMetadata(page: PageKey, localeInput?: string): Metadata {
  const locale = resolveLocale(localeInput);
  const pathname = routePath[page] || "";
  const canonicalPath =
    locale === DEFAULT_LOCALE && pathname === ""
      ? "/"
      : `/${locale}${pathname === "" ? "" : pathname}`;

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
  };
}
