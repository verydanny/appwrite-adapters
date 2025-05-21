---
"@gravlabs/appwrite-hono-adapter-node": minor
"@gravlabs/appwrite-hono-adapter-bun": minor
"@gravlabs/appwrite-elysia-adapter-node": patch
"@gravlabs/appwrite-elysia-adapter-bun": patch
---

feat: Add Elysia adapters for Bun and Node.js

This introduces two new adapters for integrating Appwrite with ElysiaJS, one for the Bun runtime and another for Node.js environments.

- **`@gravlabs/appwrite-elysia-adapter-bun`**: Leverages Bun's native APIs for optimal performance.
- **`@gravlabs/appwrite-elysia-adapter-node`**: Provides compatibility for Node.js servers.

Both adapters offer a streamlined way to handle Appwrite server-side SDK integration within ElysiaJS applications, including request and response handling, and helper functions for common Appwrite tasks.
