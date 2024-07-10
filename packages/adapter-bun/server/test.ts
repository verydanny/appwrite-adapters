import { Hono } from 'hono'
import { serve } from '@gravlabs/appwrite-hono-adapter-bun'
import { serveStatic } from '@gravlabs/appwrite-hono-adapter-bun/serveStatic'

// Bindings for Appwrite
import type { AppwriteBindings } from '@gravlabs/appwrite-hono-adapter-bun/types'

const app = new Hono<{ Bindings: AppwriteBindings }>()

app.get('/static/*', serveStatic({
    root: '/server'
}))

app.get('/', (c) =>
    c.html(`
        <h1>Testing Hono</h1>
    `),
)

app.get('/testing', c => {
    return c.text('Hello world')
})

export default serve(app)
