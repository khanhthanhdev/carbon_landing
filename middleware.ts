import createMiddleware from "next-intl/middleware";
import { locales } from "./i18n/request";

const middleware = createMiddleware({
  locales,
  defaultLocale: "vi"
});

export default middleware;

export const config = {
  matcher: [
    "/",
    "/(en|vi)/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)"
  ]
};
