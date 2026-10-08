<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Sharing platform

Follow the root AGENTS.md for the P2P simulation boundary. Reuse existing UI and API clients.
Use TanStack Query for server state and invalidate on SSE hints; modes are URL/UI state.
The explicit notifications Route Handler streams without compression. Never persist private keys in browser storage.
Keep `/demo` as an isolated sharing walkthrough without API calls or persisted credentials.
Legacy garage preview remains at `/demo/garage`; test previews separately from live sharing.
