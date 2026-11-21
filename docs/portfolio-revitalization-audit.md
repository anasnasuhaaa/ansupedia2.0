# Portfolio revitalization baseline

At b410202 on main, the public site uses SSR Astro, local fonts and portfolio assets. A Starwind sheet and dropdown handle mobile navigation and the theme. Typed portfolio records drive both section visibility and navigation. Five project images are documented title cards. Preserve their provenance, the monochrome palette and genuine experience and credential entries.

## Public experience

The hero splits a small portrait from the copy, and competing mobile heading overrides shrink the identity further at 767px. Bring text, actions and the portrait into a single composition. Organize skills by discipline, correct the security interests, and keep project descriptions accessible on narrow screens. Use the existing four/three/two-column project grid. Group contact destinations by purpose. Add bounded, cached server-side GitHub data with an explicit offline state.

The sticky header uses a fixed 150px selection threshold and can miss the last section. Use the actual header position and handle the bottom of the document. Preserve keyboard dismissal and focus return through the sheet primitive.

## Publishing and reading

Blog discovery already combines repeated category parameters with literal title search, batched category queries and publication checks. Inspect page bounds and the featured item when paginating. Keep filter URLs shareable. The article and preview share sanitized HTML, but their surrounding layouts differ. Prioritize readable measures, scrollable code, useful dates and matching previews.

The dashboard, article list and category dialogs already support routine publishing. Emphasize recently edited work and direct status-filtered navigation. Improve narrow-screen actions and mutation feedback. The editor stores structured JSON and tracks pending uploads with mapped positions. Check manual slugs, changes during a save, link selection and the path from formatting to reopened documents.

## Constraints and verification

Keep Better Auth role checks, same-origin mutation guards, rate limits, signed session handling, validated uploads and transaction-based category replacement. Preserve publication dates, published-only feeds and slug resolution. New marks need schema, validation, renderer, sanitizer and persistence coverage together. No schema change is planned.

Use the existing unit, local PostgreSQL and browser fixtures. Exercise mobile navigation, both themes, blog filters, publishing transitions and upload recovery. Check responsive dimensions and contrast in the browser. Compare the production SSR bundle with the dev experience. Keep optional GitHub credentials on the server. The existing untracked execution brief belongs to the owner.

## Implementation and verification, 21 November 2026

The home page retains the original profile mark, six projects and two themes. The first featured project with a screenshot takes the lead position on wide screens. The GitHub overview shows public repositories and followers with a retrieval date. Empty experience and credential lists stay hidden.

The blog orders featured writing before pagination, keeps literal search and OR category filtering, and redirects out-of-range pages while retaining the filters. A database outage produces an unavailable state. The dashboard uses grouped counts and orders its five recent articles by edit date. Article previews capture form values before disabling inputs. The shared schema and sanitizer support underline, and the editor can update an existing image's source and description. Saved code blocks retain a language class and unknown languages render as escaped plain text.

| Check | Result |
| --- | --- |
| `pnpm check` | 228 files, zero diagnostics |
| `pnpm test` | 33 tests passed, including localhost PostgreSQL persistence and GitHub cache failure and recovery |
| `pnpm build` | Vercel SSR artifact built locally. The admin editor chunk is 745,967 bytes before compression and triggers Vite's size warning. |
| `pnpm exec node --no-experimental-require-module scripts/verify-server-bundle.mjs` | The built homepage, RSS and login returned 200. The blog returned its expected 503 with the database disabled. |
| Chromium layout and accessibility | Home, blog and article layouts checked at 320, 375, 390, 768, 1024 and 1440 pixels in light and dark themes. Automated accessibility scenarios cover public navigation, reading, filtering and the editor. |
| External destinations | GitHub profile and project repositories, both project sites and Instagram returned HTTP 200. LinkedIn returned 999 to the automated request. Its profile remains the documented owner-supplied link. |

Browser verification used temporary localhost accounts, articles, categories and the development upload adapter. It exercised sign-in, rate limiting, session guards, logout, category CRUD, image insertion by upload, paste and drop, publication and republication, related articles, feeds and draft privacy. During verification, a notification overlapped the sticky save controls and a local image URL failed native URL-field validation. Both were corrected. The GitHub request is server-only, and the published client assets contain neither its endpoint nor its token setting. Production hosting, production PostgreSQL and Vercel Blob delivery were outside this local verification.

All 37 distinct Playwright scenarios passed across the initial run and targeted reruns. The broad run stopped during the cover-upload scenario. The public-route, notification, media and rate-limit checks were run separately to finish verification. The upload retry test now waits for its file picker to become enabled after React hydration.
