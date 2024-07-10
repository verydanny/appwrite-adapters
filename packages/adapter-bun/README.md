# Appwrite Hono Adapter for Bun

This adapter allows you to run your Hono application on Appwrite's **`bun-1.0+`** runtime. **Caution:** this library is in active development and the API is subject to change.

> [!NOTE]
> Please carefully read the **[Requirements](#requirements)**. Certain versions of this library will work with select Appwrite `bun1.0+` runtimes.

<details>
<summary><strong>Table of Contents</strong></summary>

- [Installation](#installation)
- [Usage](#usage)
- [Middleware](#middleware)
- [Static Middleware](#static-middleware)
- [Astro Middleware Example](#astro-middleware-example)
  - [1. Set up the Adapter](#1-set-up-the-adapter)
  - [2. Build your project](#2-build-your-project)
  - [3. Import and set up your Appwrite hook](#3-import-and-set-up-your-appwrite-hook)
- [Requirements](#requirements)
  - [Supported Appwrite Function API](#supported-appwrite-function-api)
- [License](#license)

</details>

## Installation

You can install it from the npm registry:

* **bun**:
  ```sh
  bun add hono @gravlabs/appwrite-hono-adapter-bun
  ```

## Usage

Import **`serve`** from `@gravlabs/appwrite-hono-adapter-bun` and write your Hono code like usual. It supports most Hono middleware as well:

```tsx
import { Hono } from "hono"
import { serve } from "@gravlabs/appwrite-hono-adapter-bun"
import { serveStatic } from "@gravlabs/appwrite-hono-adapter-bun/serveStatic"

const app = new Hono()

app.get("/static/*", serveStatic({
    root: './',
}))

app.get("/", (context) =>
    context.html(`
        <html>
            <h1>Hello world</h1>
        </html>
    `),
)

export default serve(app)
```

## Middleware

Middleware that works for Hono will work with this middleware.

## Static Middleware

Use the packaged `serveStatic` middleware to serve static files. It's best illustrated with an example. If your folder structure looks like so:

```sh
.
├── src
│   └── main.js // Appwrite function entry
├── static
│   ├── 1.jpg
│   └── 2.html
```

Your `serveStatic` middleware would look like so:
```js
import { serveStatic } from "@gravlabs/appwrite-hono-adapter-bun/serveStatic"

app.use('/static/*', serveStatic({ root: './' }))
```

And with your folder structure looking like so:
```sh
.
└─ src
   ├─ main.js // Appwrite function entry
   └─ static
     ├─ 1.jpg
     └─ 2.html
```

Your `serveStatic` middleware would look like so:
```js
import { serveStatic } from "@gravlabs/appwrite-hono-adapter-bun/serveStatic"

app.use('/static/*', serveStatic({ root: './src' }))
```

## Astro Middleware Example

It's really convenient to create an Astro static site with just Appwrite functions:

### 1. Set up the Adapter

Add the adapter to your `astro.config.mjs` file.

```js
import { defineConfig } from "astro/config"
import honoAstro from "hono-astro-adapter"

// https://astro.build/config
export default defineConfig({
	output: "server", // or hybrid if you want to use SSR and SSG
	adapter: honoAstro(),
})
```

### 2. Build your project

Build your project using the `astro build` command.

### 3. Import and set up your Appwrite hook

```javascript
import { Hono } from "hono";
import { serve } from "@gravlabs/appwrite-hono-adapter-bun"
import { serveStatic } from "@gravlabs/appwrite-hono-adapter-bun/serveStatic"
import { handler as ssrHandler } from "./dist/server/entry.mjs"

const app = new Hono()

app.use("/*", serveStatic({ root: "./dist/client/" }))
app.use(ssrHandler)

export default serve(app)
```

## Requirements

Pleae check out which context methods you can use and then [install the appropriate version.](https://appwrite.io/docs/products/functions/develop#context-object)

### Supported Appwrite Function API
| Version | Supports | Doesn't Support | 
| --- | --- | --- |
| `< 1.0.0` | <li>`res.send()`</li> <li>`res.text()`</li> <li>`res.json()`</li> <li>`res.empty()`</li> <li>`res.redirect()`</li> | <li>`res.binary()`</li> <li>`res.start()`</li> <li>`res.writeText()`</li> <li>`res.writeJson()`</li> <li>`res.writeBinary()`</li> <li>`res.end()`</li>
| `>=1.0.0 \|\| < 2.0.0` | <li>`res.send()`</li> <li>`res.text()`</li> <li>`res.json()`</li> <li>`res.empty()`</li> <li>`res.redirect()`</li> <li>`res.binary()`</li> | <li>`res.start()`</li> <li>`res.writeText()`</li> <li>`res.writeJson()`</li> <li>`res.writeBinary()`</li> <li>`res.end()`</li>
| `>=2.0.0` | <li>`res.send()`</li> <li>`res.text()`</li> <li>`res.json()`</li> <li>`res.empty()`</li> <li>`res.redirect()`</li> <li>`res.binary()`</li> <li>`res.start()`</li> <li>`res.writeText()`</li> <li>`res.writeJson()`</li> <li>`res.writeBinary()`</li> <li>`res.end()`</li> | 

## License

MIT
