import type {
    createServer,
    ServerOptions as HttpServerOptions,
    ServerResponse as HttpServerResponse,
    IncomingHttpHeaders,
    IncomingMessage,
    OutgoingHttpHeaders,
    Server,
} from 'node:http'
import type {
    createServer as createHttp2Server,
    createSecureServer as createSecureHttp2Server,
    Http2SecureServer,
    Http2Server,
    ServerOptions as Http2ServerOptions,
    Http2ServerRequest,
    Http2ServerResponse,
    SecureServerOptions as SecureHttp2ServerOptions,
} from 'node:http2'
import type {
    createServer as createHttpsServer,
    ServerOptions as HttpsServerOptions,
} from 'node:https'
import type { Stream } from 'node:stream'
import type { Elysia } from 'elysia'

export type HttpBindings = {
    incoming: IncomingMessage
    outgoing: HttpServerResponse
}

export type Http2Bindings = {
    incoming: Http2ServerRequest
    outgoing: Http2ServerResponse
}

export type NextHandlerOption = {
    fetch: FetchFunction
}

export type ServerType = Server | Http2Server | Http2SecureServer

type createHttpOptions = {
    serverOptions?: HttpServerOptions
    createServer?: typeof createServer
}

type createHttpsOptions = {
    serverOptions?: HttpsServerOptions
    createServer?: typeof createHttpsServer
}

type createHttp2Options = {
    serverOptions?: Http2ServerOptions
    createServer?: typeof createHttp2Server
}

type createSecureHttp2Options = {
    serverOptions?: SecureHttp2ServerOptions
    createServer?: typeof createSecureHttp2Server
}

type ServerOptions =
    | createHttpOptions
    | createHttpsOptions
    | createHttp2Options
    | createSecureHttp2Options

export type Options = {
    fetch: FetchFunction
    overrideGlobalObjects?: boolean
    hostname?: string
} & ServerOptions

export type CustomErrorHandler = (
    err: unknown,
    // biome-ignore lint/suspicious/noConfusingVoidType: need void
) => void | Response | Promise<void | Response>

export type NormalizeString<
    Key extends string,
    O,
    Matcher extends string,
> = Key extends keyof O
    ? Key
    : Key extends `${Matcher}${infer S}`
      ? `${Matcher}${S}`
      : never

/**
 * HTTP request methods.
 *
 * HTTP defines a set of request methods to indicate the desired action to be
 * performed for a given resource. Although they can also be nouns, these
 * request methods are sometimes referred as HTTP verbs. Each of them implements
 * a different semantic, but some common features are shared by a group of them:
 * e.g. a request method can be safe, idempotent, or cacheable.
 *
 * @public
 */
export type HTTPMethod =
    /**
     * The `CONNECT` method establishes a tunnel to the server identified by the
     * target resource.
     */
    | 'CONNECT'

    /**
     * The `DELETE` method deletes the specified resource.
     */
    | 'DELETE'

    /**
     * The `GET` method requests a representation of the specified resource.
     * Requests using GET should only retrieve data.
     */
    | 'GET'

    /**
     * The `HEAD` method asks for a response identical to that of a GET request,
     * but without the response body.
     */
    | 'HEAD'

    /**
     * The `OPTIONS` method is used to describe the communication options for the
     * target resource.
     */
    | 'OPTIONS'

    /**
     * The PATCH method is used to apply partial modifications to a resource.
     */
    | 'PATCH'

    /**
     * The `POST` method is used to submit an entity to the specified resource,
     * often causing a change in state or side effects on the server.
     */
    | 'POST'

    /**
     * The `PUT` method replaces all current representations of the target
     * resource with the request payload.
     */
    | 'PUT'

    /**
     * The `TRACE` method performs a message loop-back test along the path to the
     * target resource.
     */
    | 'TRACE'

export type InfoStatusCode = 100 | 101 | 102 | 103
export type SuccessStatusCode =
    | 200
    | 201
    | 202
    | 203
    | 204
    | 205
    | 206
    | 207
    | 208
    | 226
export type DeprecatedStatusCode = 305 | 306
export type RedirectStatusCode =
    | 300
    | 301
    | 302
    | 303
    | 304
    | DeprecatedStatusCode
    | 307
    | 308
export type ClientErrorStatusCode =
    | 400
    | 401
    | 402
    | 403
    | 404
    | 405
    | 406
    | 407
    | 408
    | 409
    | 410
    | 411
    | 412
    | 413
    | 414
    | 415
    | 416
    | 417
    | 418
    | 421
    | 422
    | 423
    | 424
    | 425
    | 426
    | 428
    | 429
    | 431
    | 451
export type ServerErrorStatusCode =
    | 500
    | 501
    | 502
    | 503
    | 504
    | 505
    | 506
    | 507
    | 508
    | 510
    | 511
/**
 * `UnofficialStatusCode` can be used to specify an unofficial status code.
 * @example
 *
 * ```ts
 * app.get('/unknown', (c) => {
 *   return c.text("Unknown Error", 520 as UnofficialStatusCode)
 * })
 * ```
 */
export type UnofficialStatusCode = -1
/**
 * If you want to use an unofficial status, use `UnofficialStatusCode`.
 */
export type StatusCode =
    | InfoStatusCode
    | SuccessStatusCode
    | RedirectStatusCode
    | ClientErrorStatusCode
    | ServerErrorStatusCode
    | UnofficialStatusCode

export type KnownAppwriteHeader =
    | 'x-appwrite-trigger'
    | 'x-appwrite-event'
    | 'x-appwrite-user-id'
    | 'x-appwrite-user-jwt'
    | 'x-appwrite-country-code'
    | 'x-appwrite-continent-code'
    | 'x-appwrite-continent-eu'

export type KnownOpenRuntimeHeader =
    | 'x-open-runtimes-timeout'
    | 'x-open-runtimes-secret'
    | 'x-forwarded-proto'
    | 'x-open-runtimes-log-id'
    | 'x-open-runtimes-logging'

export type KnownHeaders = KnownAppwriteHeader | KnownOpenRuntimeHeader

export type PatternHeaders =
    | `x-open-runtimes-${string}`
    | `x-appwrite-${string}`

// Mapped type for known headers
export type KnownHeaderMap = {
    [K in KnownHeaders]: string
}

// Extended mapped type for pattern headers
export type HeaderMap = KnownHeaderMap & {
    [key: PatternHeaders]: string
}

export type IncomingHeaders = Partial<IncomingHttpHeaders & HeaderMap> & {
    [key: string]: string
}

export type OutgoingHeaders = Partial<OutgoingHttpHeaders & HeaderMap> & {
    [key: string]: string
}

export type JSONStub = Record<string | number | symbol, unknown>

export type FetchFunction = (
    request: Request,
    env: Context,
) => ReturnType<Elysia['fetch']>

export type LogContext = (message: string | JSONStub | unknown) => void

export interface ReqContext {
    get bodyRaw(): string
    get body(): RequestInit['body']
    get bodyText(): string
    get bodyJson(): JSONStub
    get bodyBinary(): Buffer
    headers: IncomingHeaders
    method: HTTPMethod
    url: string
    query: Record<string, string>
    queryString: string
    host: string
    port: number
    scheme: 'http' | 'https'
    path: string

    /** @todo Implement in version 1.0.0+ */
}

export interface ResContext {
    send: (
        body: Stream | Buffer | string,
        statusCode?: StatusCode,
        headers?: OutgoingHeaders,
    ) => void
    json: (
        body: JSONStub,
        statusCode?: StatusCode,
        headers?: OutgoingHeaders,
    ) => void
    empty: () => void
    redirect: (
        url: string,
        statusCode?: StatusCode,
        headers?: OutgoingHeaders,
    ) => void

    /** @todo Implement in version 1.0.0+ */
    // text: (
    //     body: string,
    //     statusCode: Response['status'],
    //     headers?: Record<string, string> | OutgoingHttpHeaders,
    // ) => void
    // binary: (
    //     bytes: Buffer | Stream,
    //     statusCode: Response['status'],
    //     headers?: Record<string, string> | OutgoingHttpHeaders,
    // ) => void

    /** @todo Implement in version 2.0.0+ */
    // start: (
    //     statusCode: Response['status'],
    //     headers?: Record<string, string> | OutgoingHttpHeaders,
    // ) => void
    // writeText: (body: string) => void
    // writeJson: (body: JSONStub) => void
    // writeBinary: (bytes: Buffer | string) => void
    // end: (headers?: Record<string, string>) => void
}

export interface Context {
    req: ReqContext
    res: ResContext
    log: LogContext
    error: LogContext
}

export type AppwriteBindings = {
    [K in keyof Context]: Context[K]
}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // Custom process.env here
        }
    }
}
