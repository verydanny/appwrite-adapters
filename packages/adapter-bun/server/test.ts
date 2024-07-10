import { serve } from '../lib/main.js'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) =>
    c.html(`
        <h1>Testing Hono</h1>
    `),
)

export default serve(app)
