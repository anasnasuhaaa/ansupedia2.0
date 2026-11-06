# Implementation architecture

Astro 7 SSR with the official Vercel adapter; public UI remains Astro-native. React is limited to the Tiptap editor. PostgreSQL uses postgres.js, Drizzle versioned migrations, and normalized post/category relations. Better Auth owns password hashing, sessions and authentication tables; public signup is disabled. Admin authorization and same-origin mutation checks run on the server. Content is validated JSON, statically rendered and sanitized.

Existing uncommitted starter configuration is retained. Node >=22.23.4 is required by installed Astro; the initial host Node is 22.22.1, so verification uses a compatible local runtime. No deployment or remote changes.

References consulted: Astro routing, components, framework components and styling guides; Better Auth Astro and Drizzle integration; Tiptap static renderer; Drizzle PostgreSQL setup; Starwind installed package documentation and official documentation.
