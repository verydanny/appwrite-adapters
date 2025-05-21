import { getRequestListener } from './getRequestListener.ts'
import type { CustomErrorHandler, FetchFunction } from './types.ts'

export function serve(
    {
        fetch,
    }: {
        fetch: FetchFunction
    },
    options: {
        hostname?: string
        errorHandler?: CustomErrorHandler
        overrideGlobalObjects?: boolean
    } = {
        overrideGlobalObjects: true,
    },
) {
    return getRequestListener(fetch, options)
}
