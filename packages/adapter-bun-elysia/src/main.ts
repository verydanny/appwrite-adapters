import { Elysia } from 'elysia'
import type {
    AppwriteContext,
    ElysiaAppWithFetch,
    HTTPMethod,
    StatusCode,
} from './types'

export type AppwriteAdapterContext = {
    log: AppwriteContext['log']
    error: AppwriteContext['error']
    res: AppwriteContext['res']
    req: AppwriteContext['req']
}

const newRequestFromIncoming = (
    method: HTTPMethod,
    url: string,
    incoming: AppwriteContext['req'],
    abortController: AbortController,
) => {
    const init: RequestInit = {
        method,
        headers: incoming.headers,
        signal: abortController.signal,
    }

    if (!(method === 'GET' || method === 'HEAD')) {
        if (incoming.bodyBinary instanceof ArrayBuffer) {
            init.body = incoming.bodyBinary
        } else {
            init.body = incoming.body ?? null
        }
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

export function serve(elysiaApp: ElysiaAppWithFetch) {
    return async function handle(appwriteContext: AppwriteContext) {
        const host = appwriteContext.req.host

        try {
            const url = new URL(appwriteContext.req.url)

            if (
                url.hostname.length !== host.length &&
                url.hostname !== host.replace(/:\d+$/, '')
            ) {
                return appwriteContext.error('Invalid host header')
            }

            const parent = new Elysia().resolve(() => {
                return {
                    appwrite: appwriteContext,
                }
            })

            const request = parent.use(elysiaApp as Elysia).fetch(
                newRequestFromIncoming(
                    appwriteContext.req.method,
                    url.href,
                    appwriteContext.req,
                    /** @todo see if way to cache abort controller */
                    new AbortController(),
                ),
            )

            if (request instanceof Promise) {
                try {
                    const unwrappedRequest = await request
                    const headers = unwrappedRequest.headers.toJSON()

                    if (unwrappedRequest.body instanceof ReadableStream) {
                        return appwriteContext.res.send(
                            unwrappedRequest.body,
                            unwrappedRequest.status as StatusCode,
                            headers,
                        )
                    }

                    return appwriteContext.res.binary(
                        await unwrappedRequest.arrayBuffer(),
                        unwrappedRequest.status as StatusCode,
                        headers,
                    )
                } catch (error) {
                    return appwriteContext.error(error)
                }
            }

            const headers = request.headers.toJSON()

            if (request.body instanceof ReadableStream) {
                return appwriteContext.res.send(
                    request.body,
                    request.status as StatusCode,
                    headers,
                )
            }

            return appwriteContext.res.send(
                await request.arrayBuffer(),
                request.status as StatusCode,
                headers,
            )
        } catch (error) {
            appwriteContext.error(error)
        }

        appwriteContext.res.empty()
    }
}
