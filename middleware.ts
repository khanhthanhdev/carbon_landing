import createMiddleware from "next-intl/middleware";
import { locales } from "./i18n/request";
import { clerkMiddleware } from '@clerk/nextjs/server'



const middleware = createMiddleware({
  locales,
  defaultLocale: "vi"
});

export default clerkMiddleware(async (auth, req) => {
  return middleware(req);
});

export const config = {
  matcher: [
    "/",
    "/(en|vi)/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)"
  ]
};
