import { serve } from '../lib/main.js'
import { serveStatic } from '../lib/serveStatic.js'
import { Hono } from 'hono'

const app = new Hono()

app.get('/static/*', serveStatic({
    root: '/server'
}))

app.get('/', (c) =>
    c.html(`
        <h1>Testing Hono</h1>
    `),
)

export default serve(app)
