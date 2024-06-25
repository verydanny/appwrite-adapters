/**
 * Credit to Yusuke Wada https://github.com/yusukebe for Cacheable
 * Request/Response https://github.com/honojs/node-server that speeds
 * up Node response by factor of 3
 */
// import { Readable } from "node:stream"
import {
    newRequest,
    toRequestError,
    Request as LightweightRequest,
} from "./request.ts"
import {
    cacheKey,
    getInternalBody,
    Response as LightweightResponse,
} from "./response.ts"
// import type { TLSSocket } from "node:tls"
import type {
    Context,
    CustomErrorHandler,
    FetchCallback,
    HttpBindings,
    ReqContext,
    ResContext,
} from "./types.js"

const responseViaCache = (
    res: LightweightResponse | Response,
    outgoing: ResContext
) => {
    const [status, body, header] = (res as any)[cacheKey]
}

export const getRequestListener = (
    fetchCallback: FetchCallback,
    options: {
        hostname?: string
        errorHandler?: CustomErrorHandler
        overrideGlobalObjects?: boolean
    } = {},
) => {
    if (options.overrideGlobalObjects !== false && global.Request !== LightweightRequest) {
        Object.defineProperty(global, "Request", {
            value: LightweightRequest,
        })
        Object.defineProperty(global, "Response", {
          value: LightweightResponse
        });
    }

    return (errorHandler?: Context["error"]) => {
        return async (incoming: ReqContext, outgoing: ResContext) => {
            let res
            let req

            try {
                req = newRequest(incoming, options.hostname)
                res = fetchCallback(req, {
                    incoming,
                    outgoing,
                } as unknown as HttpBindings) as Response | Promise<Response>

                if (cacheKey in res) {
                    return
                }

                return res
            } catch (e) {
                if (!res) {
                    if (errorHandler) {
                        return errorHandler(req ? e : toRequestError(e))
                    }
                }
            }
        }
    }
}
