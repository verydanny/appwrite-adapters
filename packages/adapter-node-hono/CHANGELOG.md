# @gravlabs/appwrite-hono-adapter-node

## 0.9.0

### Minor Changes

- [#26](https://github.com/verydanny/appwrite-adapters/pull/26) [`e3aa385`](https://github.com/verydanny/appwrite-adapters/commit/e3aa38551d2e27d6baaf23f8ce9f01f7b6269b4c) Thanks [@verydanny](https://github.com/verydanny)! - feat(dx): Updated and fixed linting

  - Fixed linting
  - changed builds
  - fix types

- [#26](https://github.com/verydanny/appwrite-adapters/pull/26) [`776f7ca`](https://github.com/verydanny/appwrite-adapters/commit/776f7cae71186284c6af834deeb660936cf663a9) Thanks [@verydanny](https://github.com/verydanny)! - feat: Add Elysia adapters for Bun and Node.js

  This introduces two new adapters for integrating Appwrite with ElysiaJS, one for the Bun runtime and another for Node.js environments.

  - **`@gravlabs/appwrite-elysia-adapter-bun`**: Leverages Bun's native APIs for optimal performance.
  - **`@gravlabs/appwrite-elysia-adapter-node`**: Provides compatibility for Node.js servers.

  Both adapters offer a streamlined way to handle Appwrite server-side SDK integration within ElysiaJS applications, including request and response handling, and helper functions for common Appwrite tasks.

## 0.8.0

### Minor Changes

- [#24](https://github.com/verydanny/appwrite-adapters/pull/24) [`690dff5`](https://github.com/verydanny/appwrite-adapters/commit/690dff56378ee86f2b6110474418d68a87cae93e) Thanks [@verydanny](https://github.com/verydanny)! - @gravlabs/appwrite-hono-adapter-node

  - Bump types versions, update biome, fix lint

  @gravlabs/appwrite-hono-adapter-bun

  - Bump types versions, update biome, fix lint

## 0.7.0

### Minor Changes

- [#20](https://github.com/verydanny/appwrite-adapters/pull/20) [`4f103fe`](https://github.com/verydanny/appwrite-adapters/commit/4f103fec5006d40534a88a0eb5b710c1345bf3c3) Thanks [@verydanny](https://github.com/verydanny)! - Add better body support, leave comments, update node documentation

### Patch Changes

- [#21](https://github.com/verydanny/appwrite-adapters/pull/21) [`9e62457`](https://github.com/verydanny/appwrite-adapters/commit/9e6245783eb92408984f43384ee801b7d1a5d449) Thanks [@verydanny](https://github.com/verydanny)! - Remove unused line

## 0.6.0

### Minor Changes

- [#16](https://github.com/verydanny/appwrite-adapters/pull/16) [`13ea425`](https://github.com/verydanny/appwrite-adapters/commit/13ea4253b967da88bb8811a207ac57b9b7b90ab7) Thanks [@verydanny](https://github.com/verydanny)! - Bun had no good req.post support, added better types

## 0.5.0

### Minor Changes

- [#14](https://github.com/verydanny/appwrite-adapters/pull/14) [`f091852`](https://github.com/verydanny/appwrite-adapters/commit/f0918525c12b3ed3f9c18acea14c54792a9d5dce) Thanks [@verydanny](https://github.com/verydanny)! - - Added own `forEach` function for faster performance
  - Added AppwriteBindings for Hono
  - Fixed unused typings

## 0.4.2

### Patch Changes

- [`15972aa`](https://github.com/verydanny/appwrite-adapters/commit/15972aa77608ffa2fd1b0008b484401f57f83a82) Thanks [@verydanny](https://github.com/verydanny)! - Add a typings build step

## 0.4.1

### Patch Changes

- [#4](https://github.com/verydanny/appwrite-adapters/pull/4) [`d997fc7`](https://github.com/verydanny/appwrite-adapters/commit/d997fc7e8c94ca1655905c96dc270f77dffd6f6f) Thanks [@verydanny](https://github.com/verydanny)! - Bun adapter working for Appwrite

## 0.4.0

### Minor Changes

- [`27d1719`](https://github.com/verydanny/appwrite-adapters/commit/27d171923dc1c735038a920a5ba5daf412f44745) Thanks [@verydanny](https://github.com/verydanny)! - - Use biome for linting
  - Use biome for formatting
  - Fix minor typing annoyance
