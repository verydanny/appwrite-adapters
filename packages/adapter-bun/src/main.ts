import type { Hono } from "hono";
import type { Context } from "./types";

export function serve(app: Hono) {
    return async function handle(context: Context) {
        const url = new URL(context.req.url)
        const request = app.fetch(new Request(url))

        if (request instanceof Promise) {
            const unwrappedRequest = await request

            return context.res.send(
                await unwrappedRequest.arrayBuffer(),
                unwrappedRequest.status,
                unwrappedRequest.headers.toJSON()
            )
        }

        if (request.body instanceof ReadableStream) {
            return context.res.send(
                request.body,
                request.status,
                request.headers.toJSON()
            )
        }
    }
}
