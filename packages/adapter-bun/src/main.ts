import type { Context, FetchFunction, HTTPMethod, StatusCode } from './types'

const newRequestFromIncoming = (
    method: HTTPMethod,
    url: string,
    incoming: Context['req'],
    abortController: AbortController
) => {
    const init: RequestInit = {
        method,
        headers: incoming.headers,
        signal: abortController.signal,
    }

    if (!(method === 'GET' || method === 'HEAD')) {
        /** @todo This will using incoming.body in future versions because it supports binary */
        init.body = incoming.bodyRaw ?? null
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

export function serve({
    fetch,
}: {
    fetch: FetchFunction
}) {
    return async function handle(context: Context) {
        const host = context.req.host

        try {
            const url = new URL(context.req.url)

            if (
                url.hostname.length !== host.length &&
                url.hostname !== host.replace(/:\d+$/, '')
            ) {
                return context.error('Invalid host header')
            }

            /** @todo: Cache Response and Request */
            const request = fetch(
                newRequestFromIncoming(
                    context.req.method,
                    url.href,
                    context.req,
                    /** @todo see if way to cache abort controller */
                    new AbortController(),
                ),
                context,
            )

            if (request instanceof Promise) {
                try {
                    const unwrappedRequest = await request
                    const headers = unwrappedRequest.headers.toJSON()

                    /** @todo version 1.0.0+ */
                    // if (unwrappedRequest.body instanceof ReadableStream) {
                    //     return context.res.send(
                    //         unwrappedRequest.body,
                    //         unwrappedRequest.status as StatusCode,
                    //         headers,
                    //     )
                    // }

                    return context.res.send(
                        await unwrappedRequest.arrayBuffer(),
                        unwrappedRequest.status as StatusCode,
                        headers,
                    )
                } catch (error) {
                    return context.error(error)
                }
            }

            const headers = request.headers.toJSON()

            /** @todo version 1.0.0+ */
            // if (request.body instanceof ReadableStream) {
            //     return context.res.send(
            //         request.body,
            //         request.status as StatusCode,
            //         headers,
            //     )
            // }

            return context.res.send(
                await request.arrayBuffer(),
                request.status as StatusCode,
                headers,
            )
        } catch (error) {
            context.error(error)
        }

        return context.res.empty()
    }
}
