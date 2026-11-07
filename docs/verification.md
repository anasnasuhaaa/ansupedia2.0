# Verification

Portfolio and CMS refinements verified locally on 2026-11-07 (Asia/Jakarta), starting from `3a8022949edc47f5854547932116f85753f46bb8` with pnpm 12.16.1 and its managed Node 24.22.2 runtime. A subsequent execution of `PROMPT.md` audited local HEAD `b77ba61`, where all six requested stage commits were already present, and added the upload regressions and fixes described below. Uncommitted user changes were preserved.

## Final checks

- `pnpm check`: 220 files, zero errors, warnings or hints.
- `pnpm test`: 11 tests passed across three files, including the real localhost PostgreSQL integration test.
- `pnpm test:browser`: all 24 Chromium tests passed in the final standalone run, including the two added cover-upload regression tests.
- `pnpm build`: Vercel SSR production build passed. The existing editor chunk-size warning remains (over 500 kB); it is not suppressed.
- `git diff --check`: passed before each stage commit and final review.

## Browser and security coverage

- Exactly four project columns at 1440/1280px, three at 1024/768px, and two at 390/375/320px, with no document overflow. Existing container alignment, mobile navigation, CTAs and social links remain intact. The redundant introductory identity block is absent and the avatar is within the main heading composition.
- Initial OS theme, live OS changes until an explicit choice, saved Light/Dark choices through reload and navigation, and exactly two menu choices without Appearance/System labels. The existing pre-paint Starwind initialization remains in the document head.
- Admin navigation plus one vertical article form, with no nested settings sidebar. Mobile Sheet navigation, form widths, title/slug generation, rich text formatting, selection-preserving links, unsafe URL rejection, preview and publication controls remain functional.
- Real file upload through the authenticated endpoint and local adapter: insertion at the intended position; edits before and after the marker during an intentionally held upload; automatic insertion; typing below a completed upload; node selection/deletion; undo/redo; persistence through saving, reopening, reloading and publishing; identical public paragraph/image order; successfully loaded image bytes. Actual ClipboardEvent and DragEvent handlers also create regular image nodes.
- Failed signature validation leaves no image node or preview. Unauthorized and cross-origin uploads remain denied; SVG and invalid local filenames are rejected. Unit tests explicitly switch to production mode and verify that local URLs, local writes and local asset serving are disabled without Blob credentials.
- Local cover uploads save, reopen, reload and publish correctly, with the same image URL and alternative text in the public article. Native input URL validation no longer rejects generated development paths, while the shared validation still rejects HTTP image URLs. A failed cover upload can retry the same file and clears its stale URL error after success. Cover and inline file pickers reset after reading the selected File.
- Sonner loading/success/error feedback on article, category, preview, upload and authentication actions. Redirect success is consumed once. Malformed, unknown, expired or mismatched flash messages are ignored, and query parameters cannot fabricate a success message. One notification host serves both Astro and React. Theme changes and bottom-center mobile positioning are verified.
- Existing content validation, sanitization, authorization, rate limiting, draft/public visibility, category relationships, transactional CRUD, feeds and sitemap tests are retained. Axe WCAG 2 A/AA checks pass in both homepage themes, theme/mobile menus and the narrow editor. This is not a full assistive-technology audit.

Fixtures use a temporary local administrator and uniquely prefixed articles/categories, removed in `finally`. Logout tests use separate sessions so they do not revoke the shared fixture. No existing credentials or articles are changed. Browser image fixtures remove their generated local assets. Mutation tests skip remote databases and upload tests skip configured production Blob credentials.

During iteration, tests caught and corrected the image focus race and continuation-caret behavior, plus a test-only TypeScript context assertion. An overlapping Playwright run encountered shared artifact-directory collisions. Existing browser tests were also stabilized by targeting the first paragraph for heading changes, waiting for Tiptap focus restoration, and waiting for CSS transitions before contrast scans. The final full run is standalone. No failed run is reported as passing.

The follow-up's initial browser run passed 21 of 22 tests: native document-start navigation stalled beside an upload widget in an empty paragraph, so text intended for the first paragraph landed after the marker. Focus restoration alone did not fix this. Pending uploads now handle document-start/end navigation with ProseMirror selections; normal navigation is unchanged when no upload marker exists. A stronger assertion checks the first paragraph before the delayed request completes. Both new cover tests also failed before their fixes, detecting native URL rejection and a retained file-picker value. The focused upload suite then passed all five tests, followed by the complete 24-test run. Authentication fixtures respected the existing rate-limit cooldown; security settings were not relaxed.

## Visual review

Screenshots of the mobile homepage and desktop editor were visually inspected. Browser artifacts are local and ignored under `test-results/`, including the homepage at 1440/390px in both themes, dashboard, mobile article table, article reading view, and desktop/mobile editor. The images use actual content or clearly marked temporary fixtures.

## Changed files

- `.gitignore`
- `README.md`
- `docs/architecture.md`
- `docs/verification.md`
- `package.json`
- `pnpm-lock.yaml`
- `src/components/admin/CategoryDialog.astro`
- `src/components/admin/ConfirmDelete.astro`
- `src/components/admin/Editor.tsx`
- `src/components/admin/image-upload.ts`
- `src/components/notifications/NotificationHost.tsx`
- `src/components/portfolio/ProjectCard.astro`
- `src/components/site/ThemeControl.astro`
- `src/layouts/AdminLayout.astro`
- `src/layouts/BaseLayout.astro`
- `src/lib/blog/urls.ts`
- `src/lib/notifications.ts`
- `src/lib/uploads/storage.ts`
- `src/pages/admin/login.astro`
- `src/pages/admin/posts/[id].astro`
- `src/pages/admin/posts/new.astro`
- `src/pages/api/admin/upload.ts`
- `src/pages/dev-uploads/[filename].ts`
- `src/pages/index.astro`
- `src/styles/editor.css`
- `src/styles/global.css`
- `tests/browser/editorial.spec.ts`
- `tests/browser/fixtures.ts`
- `tests/browser/notifications.spec.ts`
- `tests/browser/site.spec.ts`
- `tests/browser/uploads.spec.ts`
- `tests/uploads.test.ts`
- Removed the unused `src/components/starwind/toast/` components, exports and stylesheet.

## Operational limits

Production Vercel Blob delivery, Neon connectivity and deployed hosting were not exercised; no production credentials were used. Development uploads remain local and must be replaced with HTTPS persistent-storage URLs before moving articles to production. File uploads are serialized, and save/preview controls remain disabled during an upload while typing remains available. Meaningful alternative text should be supplied before choosing a file; otherwise the filename is used. Redirect flash notifications require sessionStorage. Local development assets have no automatic garbage collection.

The build remains subject to the existing editor bundle-size warning. No database resets, schema changes, migrations, seeding or remote database writes were performed. No Git history was rewritten. Existing edits to `src/layouts/Layout.astro`, the default title in `src/layouts/BaseLayout.astro`, `.vscode/starwind.code-snippets`, and `PROMPT.md` remain outside implementation commits. The follow-up also leaves the user's uncommitted README changes untouched. Six focused local commits cover the requested stages, with a subsequent upload fix and verification documentation commit. No remote push, pull request, or deployment occurred. The existing background server remains available at http://localhost:4321; manage it with `pnpm dev:status`, `pnpm dev:logs`, and `pnpm dev:stop`.

Reference documentation consulted: [Astro components](https://docs.astro.build/en/basics/astro-components/), [styles](https://docs.astro.build/en/guides/styling/), [framework components](https://docs.astro.build/en/guides/framework-components/), [routing](https://docs.astro.build/en/guides/routing/), [Tiptap extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension), [Sonner](https://sonner.emilkowal.ski/). Installed Starwind and Tiptap source/types were also inspected.
