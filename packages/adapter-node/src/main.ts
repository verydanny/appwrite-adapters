import { Readable } from "node:stream"
import { getRequestListener } from "./getRequestListener.js"
import type { Context, CustomErrorHandler } from "./types.ts"

export function serve(
    app: import("hono").Hono,
    options: {
        hostname?: string
        errorHandler?: CustomErrorHandler
        overrideGlobalObjects?: boolean
    } = {
        overrideGlobalObjects: true,
    },
) {
    return getRequestListener(app.fetch, options)

    // return async (context: Context) => {
    //     const listener = initializeListener(context.error)

    //     try {
    //         const response = await listener(context.req, context.res)

    //         if (response) {
    //             const blob = await response.blob()

    //             const headers = Object.fromEntries(response.headers.entries())

    //             // This is only needed on Appwrite, if this isn't included
    //             // then text and json-based routes will loop forever
    //             if (!headers["content-length"] && blob.size) {
    //                 headers["content-length"] = blob.size.toString()
    //             }

    //             headers["Cache-Control"] = "public,max-age=31536000"

    //             return context.res.send(
    //                 Readable.from(blob.stream()),
    //                 200,
    //                 headers,
    //             )
    //         }
    //     } catch (e) {
    //         context.error(e)
    //     }
    // }
}
