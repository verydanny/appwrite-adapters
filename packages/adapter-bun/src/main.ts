import CacheableRequest from 'cacheable-request'
import type { Hono } from 'hono'
import type { Context } from './types'

const newRequestFromIncoming = (
    method: string,
    url: string,
    incoming: Context['req'],
    abortController: AbortController,
) => {
    const init: RequestInit = {
        method,
        headers: incoming.headers,
        signal: abortController.signal,
    }

    if (method === 'TRACE') {
        init.method = 'GET'
        const req = new Request(url, init)

        Object.defineProperty(req, 'method', {
            get() {
                return 'TRACE'
            },
        })

        return req
    }

    return new Request(url, init)
}

export function serve(app: Hono) {
    return async function handle(context: Context) {
        console.log(context.req)
        const host = context.req.host

        try {
            const url = new URL(context.req.url)

            if (
                url.hostname.length !== host.length &&
                url.hostname !== host.replace(/:\d+$/, '')
            ) {
                return context.error('Invalid host header')
            }

            // TODO: Cache Response and Request
            const request = app.fetch(newRequestFromIncoming(
                context.req.method,
                url.href,
                context.req,
                // TODO: see if way to cache abort controller
                new AbortController()
            ))

            if (request instanceof Promise) {
                try {
                    const unwrappedRequest = await request

                    if (unwrappedRequest.body instanceof ReadableStream) {
                        return context.res.send(
                            unwrappedRequest.body,
                            unwrappedRequest.status,
                            unwrappedRequest.headers.toJSON(),
                        )
                    }

                    return context.res.send(
                        await unwrappedRequest.arrayBuffer(),
                        unwrappedRequest.status,
                        unwrappedRequest.headers.toJSON(),
                    )
                } catch (error) {
                    return context.error(error)
                }
            }

            if (request.body instanceof ReadableStream) {
                return context.res.send(
                    request.body,
                    request.status,
                    request.headers.toJSON(),
                )
            }

            return context.res.send(
                await request.arrayBuffer(),
                request.status,
                request.headers.toJSON(),
            )
        } catch (error) {
            context.error(error)
        }

        return context.res.empty()
    }
}
