# Implementation architecture

Astro 7 SSR with the official Vercel adapter; public UI remains Astro-native. React is limited to the Tiptap editor and one Sonner notification host on CMS pages. PostgreSQL uses postgres.js, Drizzle versioned migrations, and normalized post/category relations. Better Auth owns password hashing, sessions and authentication tables; public signup is disabled. Admin authorization and same-origin mutation checks run on the server. Content is validated JSON, statically rendered and sanitized.

Existing uncommitted starter configuration is retained. Node >=22.23.4 is required by installed Astro; the initial host Node is 22.22.1, so verification uses a compatible local runtime. No deployment or remote changes.

References consulted: Astro routing, components, framework components and styling guides; Better Auth Astro and Drizzle integration; Tiptap static renderer; Drizzle PostgreSQL setup; Starwind installed package documentation and official documentation.

## CMS refinements

The article editor has one vertical form within the right admin region. Temporary image-upload decorations are maintained by a ProseMirror plugin and mapped through document transactions. They never enter persisted JSON. Successful requests insert ordinary Image nodes; failed requests remove decorations. Cursor restoration moves below an inserted image only if the document and selection stayed unchanged during upload.

While upload decorations exist, document-start/end shortcuts use ProseMirror selections so native keyboard navigation cannot stall beside a noneditable preview in an empty paragraph. File pickers clear their selection after reading the File, allowing the same file to be retried. Successful cover uploads clear only the cover URL error. The cover URL input delegates validation to the shared URL rules, supporting generated development paths as well as HTTPS URLs; production still rejects local paths.

`src/lib/uploads/storage.ts` selects Vercel Blob when configured. Without a token, only development may write generated raster files under ignored `.local/uploads/`. A development-only endpoint serves strictly validated filenames. Production rejects local paths and never writes local uploads. PostgreSQL stores article JSON and URLs, never uploaded bytes.

`src/lib/notifications.ts` shares Sonner between Astro scripts and React. `BaseLayout.astro` mounts a single host for admin/login pages. Flash messages use allowlisted codes, a matching destination pathname, a 30-second expiry and consume-before-display storage semantics. They are written only after successful mutations.
