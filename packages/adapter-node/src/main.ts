import { getRequestListener } from './getRequestListener.ts'
import type { CustomErrorHandler } from './types.ts'

export function serve(
    app: import('hono').Hono,
    options: {
        hostname?: string
        errorHandler?: CustomErrorHandler
        overrideGlobalObjects?: boolean
    } = {
        overrideGlobalObjects: true,
    },
) {
    return getRequestListener(app.fetch, options)
}
