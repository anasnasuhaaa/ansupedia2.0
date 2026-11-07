# UI refinement audit

Starting local HEAD: `0179929`. `git fetch origin` was attempted before edits but failed because GitHub DNS could not resolve in this environment. As a read-only fallback, the connected GitHub comparison API verified that remote `main` is identical to `0179929fa3677dd415e8c4103e019de59835c771` (zero commits ahead or behind). No remote changes were made.

Existing local changes in `src/layouts/Layout.astro`, `.vscode/starwind.code-snippets`, and `PROMPT.md` are excluded from implementation commits.

The existing PostgreSQL schema, migration history, Better Auth guards, upload validation, JSON document validation and HTML sanitization remain the source of truth. No database reset or schema migration is needed.

Official references consulted:

- https://docs.astro.build/en/basics/astro-components/
- https://docs.astro.build/en/guides/styling/
- https://docs.astro.build/en/guides/framework-components/
- https://starwind.dev/docs/getting-started/cli/
- https://starwind.dev/docs/components/navigation-menu/
- https://starwind.dev/docs/components/sheet/
- https://starwind.dev/docs/components/theme-toggle/

Starwind CLI 3.5.0 installed styled source from the bundled registry, alongside the existing `@starwind-ui/astro` 1.4.0 runtime. Generated component prop types were inspected locally before composition. Interactive React editor controls use Radix Dialog/Tooltip, keeping Astro components outside the React tree.

Additional official references consulted:

- https://docs.astro.build/en/guides/routing/
- https://www.radix-ui.com/primitives/docs/components/dialog
- https://tiptap.dev/docs/editor/extensions/nodes/code-block-lowlight
- https://tiptap.dev/docs/editor/extensions/functionality/placeholder

Implementation stages are committed separately. The editor now supports H1–H4 by extending the explicit heading allowlist and sanitizer together, without permitting arbitrary nodes, attributes or URL schemes. React editor styles reuse the installed Starwind variant functions; no Astro component is mounted in React. The only new query behavior is batch hydration of existing category relationships and category usage counts.
