import { serve } from "../src/main"
import { Hono } from "hono"

const app = new Hono()

app.get("/", (context) =>
    context.html(`
        <html>
            <h1>Hello world</h1>
        </html>
    `),
)

export default serve(app)
