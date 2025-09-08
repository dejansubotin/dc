# SEO Plan for collab.flowops.me

This document captures ideas and a roadmap to improve SEO/discoverability while protecting private content.

## Implemented

- Meta tags in `index.html`: description, theme-color, canonical, Open Graph/Twitter, web manifest.
- robots control:
  - `public/robots.txt` disallows `/monitor`, `/uploads/`, and `/?sessionId=` patterns.
  - Nginx sets `X-Robots-Tag: noindex, nofollow` on `/monitor` and `/uploads` routes.
- Prevent indexing of session pages at runtime: app injects `<meta name="robots">` = `noindex, nofollow` when a `sessionId` query exists; otherwise `index, follow` for home.
- Favicon and PWA manifest wired; static `public` is copied in Docker build.

## Next (high‑value)

1. Landing/marketing content at `/`
   - Clear H1–H3, benefits, feature list, screenshots, FAQ, and internal links.
   - Optional: split SPA to `/app` and keep `/` as static landing; Nginx routes accordingly.
2. Structured Data (JSON‑LD)
   - Add `SoftwareApplication`/`WebApplication` JSON‑LD with name, description, URL, and `offers` (free).
3. Sitemap
   - Minimal sitemap listing only public landing pages. Avoid session URLs. Serve `/sitemap.xml` statically or generate.
4. Core Web Vitals
   - Bundle hygiene: self‑host critical scripts (avoid large CDN injects), ensure async/defer as needed.
   - Caching/compression: long‑lived cache headers for static assets, enable gzip/Brotli if not already.
   - Optimized hero images for landing; use correctly sized images.
5. Accessibility
   - Semantic headings, alt text, high contrast, focus styles. Helps usability + SEO.
6. Social preview
   - Create `/public/og-image.png` (branded screenshot/illustration) and validate OG/Twitter cards.

## Optional (advanced)

- SSR/Pre‑render landing
  - Vite SSR or a static generator to pre‑render marketing content for crawlers.
- Analytics & Search Console
  - Add Google Search Console/Bing Webmaster Tools; submit sitemap and monitor indexing.
- i18n
  - If multilingual, add hreflang tags and localized content sections.

## Notes

- Session URLs and private resources must remain non‑indexable; current controls enforce that.
- If adding a separate landing page, keep content crawlable and link‑rich; avoid app‑only content on `/`.

