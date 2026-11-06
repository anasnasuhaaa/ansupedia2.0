# Ansupedia

Anas Nasuha's Astro 7 portfolio and PostgreSQL blog CMS. Public pages are server-rendered Astro. Only the Tiptap editor hydrates React. Project metadata and assets are maintained in this repository; articles and categories are live database content and require no rebuild to publish.

## Development

Use pnpm 12 and Node >=22.23.4. The pnpm `devEngines.runtime` configuration downloads the tested Node 24 runtime automatically. Install dependencies:

```sh
pnpm install
pnpm dev
pnpm dev:status
pnpm dev:logs
pnpm dev:stop
```

`pnpm dev` runs `astro dev --background`. The site is available at http://localhost:4321 and administration at http://localhost:4321/admin. Never launch a second foreground dev server.

```sh
pnpm check
pnpm test
pnpm test:browser
pnpm build
```

Browser tests require the dev server and `pnpm exec playwright install chromium`. The authenticated browser test uses `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` only when temporarily supplied; otherwise that test is skipped. Database tests run only against a configured localhost database, create uniquely named fixtures, and clean them up. They do not reset tables. A build creates Vercel artifacts locally; it does not deploy.

## Local PostgreSQL setup

1. Create the database `ansupedia2` with your local PostgreSQL administrator, if it doesn't already exist (`createdb ansupedia2` with the appropriate local role).
2. Copy `.env.example` to `.env` only if `.env` does not already exist. Enter your real connection string, including percent-encoding any reserved characters in the password.
3. Generate a random authentication secret, for example `openssl rand -base64 48`. Set `BETTER_AUTH_URL` and `PUBLIC_SITE_URL` to `http://localhost:4321` locally.
4. Apply migrations and seed the seven initial categories:

```sh
pnpm db:migrate
pnpm db:seed
```

The migration runner refuses placeholder URLs and remote databases without an explicit flag. `pnpm db:generate` creates versioned SQL after schema edits; inspect and commit it before applying. `pnpm db:studio` opens Drizzle Studio. Do not use destructive schema synchronization or reset commands.

## Initial administrator

Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` of 12–128 characters in your local environment. Run:

```sh
pnpm admin:bootstrap
```

The bootstrap uses Better Auth's password hashing and a transaction with an advisory lock; it refuses to run if any account exists. It creates one administrator and a credential account. **Remove both seed values from `.env` immediately afterwards.** Do not put them in production configuration. There is no default password, public signup, password-reset endpoint, or account creation UI. Account recovery currently requires an authorized operator; there is no self-service reset flow.

Better Auth validates secure cookie sessions. An explicit stored administrator role is required for every admin page and API mutation. Same-origin checks protect mutations. Authentication endpoints are allowlisted. Sign-in is limited to five attempts per minute, stored in PostgreSQL so the limit is shared across serverless instances. Client IP is overwritten from Astro's server request context; maintain a trusted ingress when self-hosting.

## Writing

- `/admin`: counts and recent articles.
- `/admin/posts`: search, filter, edit, view, and delete with confirmation.
- `/admin/posts/new`, `/admin/posts/[id]`: Tiptap editor, metadata, categories, cover image, preview, draft and publish actions.
- `/admin/categories`: create, rename, change slug, and delete categories. Deletion removes category associations, never articles.
- `/blog`: title search, category filter, featured article and pagination.
- `/blog/[slug]`: published articles with related writing, reading time and structured metadata. Drafts return 404 and are excluded from feeds and sitemap.

Content is JSONB, validated against an allowlist and ProseMirror's schema. The same Tiptap static renderer and HTML sanitizer power preview and public pages. Links and image schemes are restricted. Code is escaped and highlighted. The editor does not autosave; use Save draft or Publish. Publication dates are set on first publish and retained on subsequent edits.

## Images

Project images are local assets; source provenance and factual checks are in [docs/content-sources.md](docs/content-sources.md). Title cards are explicitly identified as placeholders in alternative text. The public organizational website's source repository could not be verified, so its card has no GitHub link. Experience and credentials intentionally start empty.

Set `BLOB_READ_WRITE_TOKEN` to enable Vercel Blob uploads. The server accepts PNG, JPEG and WebP, checks file signatures and MIME type, limits images to 3 MB, and generates random object names. SVG uploads are disallowed. Tokens never reach browsers. Without a token, cover and inline HTTPS image URLs work normally. Remote media is not downloaded by the server. Deleting a post does not delete Blob objects because images may be shared; clean unused objects separately in Vercel.

## Neon / Vercel production

No remote changes are performed by development or build commands.

1. Create/configure your own Neon PostgreSQL database and Vercel project with the official Astro adapter already present here.
2. Set a Neon pooled `DATABASE_URL` with TLS (`sslmode=require`), a new strong `BETTER_AUTH_SECRET`, and HTTPS values for `BETTER_AUTH_URL` and `PUBLIC_SITE_URL`. Optionally supply the Blob token.
3. Review committed SQL, confirm the target, and explicitly authorize a production migration. From an appropriately secured local environment, run `pnpm db:migrate --production-authorized`. Seed categories separately with `pnpm db:seed` against that authorized database.
4. Bootstrap the production administrator once through a secure local environment, then remove seed credentials. Do not run bootstrap during builds.
5. Build with `pnpm build`; deploy only when you choose. Verify login, publication, feeds and media in the deployed environment.

postgres.js uses a small pool, idle/connect timeouts and `prepare:false` for compatibility with transaction poolers. A single official Vercel Node function serves SSR routes. Database queries are parameterized and category changes occur transactionally with article edits. Schema uses timezone-aware timestamps and cascading junction foreign keys.

## Content and architecture

- `src/data`: typed profile, projects, skills, experience, certification configuration.
- `src/components/portfolio`: reusable project cards and monochrome technology tags.
- `src/components/admin/Editor.tsx`: React editor island.
- `src/db/schema.ts`, `src/db/queries`: normalized schema and query layer.
- `src/lib/auth`: server authentication and authorization.
- `src/lib/blog`, `src/lib/validation`: renderer, validation and feed utilities.
- `drizzle`: committed migration history.

Starwind's official theme initialization runs before paint. Light, dark and system settings persist; the runtime follows OS preference changes. Semantic theme tokens and Astro Starwind buttons are shared throughout the interface. Inter is bundled locally. Public pages include canonical, Open Graph, Twitter metadata, Person/BlogPosting JSON-LD, `/sitemap.xml`, `/robots.txt` and `/rss.xml`.

## Verification and limitations

See [docs/verification.md](docs/verification.md) for the final run results. No invented employment, awards, credentials or published example articles are included. Vercel deployment, Neon connectivity and Blob upload delivery require your external configuration and remain manual. Automated accessibility checks do not replace a full assistive-technology audit. The existing starter `Layout.astro`, editor settings and `PROMPT.md` were left intact where unrelated to implementation.
