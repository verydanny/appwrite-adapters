import { Hono } from "hono"
import { serve } from "@gravlabs/appwrite-hono-adapter-node"
import { serveStatic } from "@gravlabs/appwrite-hono-adapter-node/serveStatic"

const app = new Hono()

app.get("/static/*", serveStatic({
    root: './examples',
}))

app.get("/", (context) =>
    context.html(`
        <html>
            <h1>Hello world</h1>
        </html>
    `),
)

export default serve(app)
