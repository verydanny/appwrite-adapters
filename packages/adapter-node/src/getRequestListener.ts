/**
 * Credit to Yusuke Wada https://github.com/yusukebe for Cacheable
 * Request/Response https://github.com/honojs/node-server that speeds
 * up Node response by factor of 3
 */
// import type { OutgoingHttpHeaders } from "node:http"
import {
    newRequest,
    toRequestError,
    Request as LightweightRequest,
} from './request.ts'
import {
    cacheKey,
    getInternalBody,
    Response as LightweightResponse,
} from './response.ts'
// @ts-ignore
import { buildOutgoingHttpHeaders, nodeWebStreamToBuffer } from './utils.ts'
import type {
    Context,
    CustomErrorHandler,
    FetchCallback,
    HttpBindings,
} from './types.js'
import { Readable } from 'node:stream'

const regBuffer = /^no$/i
const regContentType = /^(application\/json\b|text\/(?!event-stream\b))/i

const handleFetchError = (e: unknown): Response =>
    new Response(null, {
        status:
            e instanceof Error &&
            (e.name === 'TimeoutError' || e.constructor.name === 'TimeoutError')
                ? 504 // timeout error emits 504 timeout
                : 500,
    })

const responseViaCache = async (
    res: LightweightResponse,
    outgoing: Context['res'],
    // @ts-ignore
    errorLogger: Context['error'],
) => {
    const [status, body, headers] = (res as Required<LightweightResponse>)[
        cacheKey
    ]

    if (typeof body === 'string') {
        headers['Content-Length'] = Buffer.byteLength(body)

        return outgoing.send(
            Buffer.from(body),
            status,
            headers as Record<string, string>,
        )
    }

    return outgoing.send(
        Readable.from(body as ReadableStream),
        status,
        headers,
    )

    // TODO: Future Stream
    // outgoing.start(status, header)
    // return writeFromReadableStream(body as ReadableStream, outgoing)?.catch(
    //     errorLogger,
    // )
}

const responseViaResponseObject = async (
    res:
        | Response
        | Promise<Response>
        | LightweightResponse
        | Promise<LightweightResponse>,
    outgoing: Context['res'],
    options: { errorHandler?: CustomErrorHandler | Context['error'] } = {},
) => {
    if (res instanceof Promise) {
        if (options.errorHandler) {
            try {
                // biome-ignore lint/style/noParameterAssign: Saving memory by just reassigning
                res = await res
            } catch (err) {
                const errRes = await options.errorHandler(err)
                if (!errRes) {
                    return
                }
                // biome-ignore lint/style/noParameterAssign: Saving memory by just reassigning
                res = errRes
            }
        } else {
            // biome-ignore lint/style/noParameterAssign: Saving memory by just reassigning
            res = await res.catch(handleFetchError)
        }
    }

    if (cacheKey in res) {
        return responseViaCache(
            res as LightweightResponse,
            outgoing,
            options?.errorHandler as Context['error'],
        )
    }

    const resHeaderRecord = buildOutgoingHttpHeaders((res as Response).headers)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalBody = getInternalBody(res as Response)
    if (internalBody) {
        if (internalBody.length) {
            resHeaderRecord['content-length'] = internalBody.length
        }

        // TODO: Future Stream
        // outgoing.start((res as Response).status, resHeaderRecord)
        if (
            typeof internalBody.source === 'string' ||
            internalBody.source instanceof Uint8Array
        ) {
            return outgoing.send(
                Buffer.from(internalBody.source),
                (res as Response).status,
                resHeaderRecord,
            )
        }

        if (internalBody.source instanceof Blob) {
            return outgoing.send(
                Buffer.from(await internalBody.source.arrayBuffer()),
                (res as Response).status,
                resHeaderRecord,
            )
        }

        // TODO: Future Stream
        // await writeFromReadableStream(internalBody.stream, outgoing)
        return outgoing.send(
            Readable.from(internalBody.stream),
            (res as Response).status,
            resHeaderRecord,
        )
    }

    if ((res as Response).body) {
        /**
         * If content-encoding is set, we assume that the response should be not decoded.
         * Else if transfer-encoding is set, we assume that the response should be streamed.
         * Else if content-length is set, we assume that the response content has been taken care of.
         * Else if x-accel-buffering is set to no, we assume that the response should be streamed.
         * Else if content-type is not application/json nor text/* but can be text/event-stream,
         * we assume that the response should be streamed.
         */

        const {
            'transfer-encoding': transferEncoding,
            'content-encoding': contentEncoding,
            'content-length': contentLength,
            'x-accel-buffering': accelBuffering,
            'content-type': contentType,
        } = resHeaderRecord

        if (
            transferEncoding ||
            contentEncoding ||
            contentLength ||
            // nginx buffering variant
            (accelBuffering && regBuffer.test(accelBuffering as string)) ||
            !regContentType.test(contentType as string)
        ) {
            // TODO: Future Stream
            // outgoing.start((res as Response).status, resHeaderRecord)
            if ((res as Response).body) {
                // TODO: Future Stream
                // await writeFromReadableStream(
                //     (res as Response).body as ReadableStream,
                //     outgoing,
                // )

                return outgoing.send(
                    Readable.from((res as Response).body as ReadableStream),
                    (res as Response).status,
                    resHeaderRecord,
                )
            }
        } else {
            const buffer = await (res as Response).arrayBuffer()
            resHeaderRecord['content-length'] = buffer.byteLength

            return outgoing.send(
                Buffer.from(buffer),
                (res as Response).status,
                resHeaderRecord,
            )
        }
    }

    return outgoing.empty()
}

export const getRequestListener = (
    fetchCallback: FetchCallback,
    options: {
        hostname?: string
        errorHandler?: CustomErrorHandler
        overrideGlobalObjects?: boolean
    } = {},
) => {
    if (
        options.overrideGlobalObjects !== false &&
        global.Request !== LightweightRequest
    ) {
        Object.defineProperty(global, 'Request', {
            value: LightweightRequest,
        })
        Object.defineProperty(global, 'Response', {
            value: LightweightResponse,
        })
    }

    return (context: Context) => {
        let res:
            | undefined
            | Response
            | LightweightResponse
            | Promise<Response>
            | Promise<LightweightResponse> = undefined
        let req: undefined | Request | LightweightRequest = undefined

        try {
            req = newRequest(context.req, options.hostname)

            if (req) {
                res = fetchCallback(req, {
                    incoming: context.req,
                    outgoing: context.res,
                    error: context.error,
                    log: context.log,
                } as unknown as HttpBindings) as
                    | Response
                    | LightweightResponse
                    | Promise<Response>
                    | Promise<LightweightResponse>

                if (cacheKey in res) {
                    return responseViaCache(res, context.res, context.error)
                }
            }
        } catch (e) {
            if (!res) {
                return context.error(req ? e : toRequestError(e))
            }

            return context.error(e)
        }

        try {
            if (res) {
                return responseViaResponseObject(res, context.res, {
                    errorHandler: context.error,
                })
            }
        } catch (e) {
            return context.error(e)
        }
    }
}
