import { serve } from "../lib/main.js"
import { serveStatic } from '../lib/serveStatic.js'
import { Hono } from "hono"

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
