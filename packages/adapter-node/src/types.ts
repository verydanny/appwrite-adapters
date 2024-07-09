import type {
    createServer,
    IncomingMessage,
    Server,
    ServerOptions as HttpServerOptions,
    ServerResponse as HttpServerResponse,
    OutgoingHttpHeaders,
} from 'node:http'
import type {
    createSecureServer as createSecureHttp2Server,
    createServer as createHttp2Server,
    Http2ServerRequest,
    Http2Server,
    Http2ServerResponse,
    Http2SecureServer,
    SecureServerOptions as SecureHttp2ServerOptions,
    ServerOptions as Http2ServerOptions,
} from 'node:http2'
import type {
    createServer as createHttpsServer,
    ServerOptions as HttpsServerOptions,
} from 'node:https'
import type { Stream } from 'node:stream'

export type HttpBindings = {
    incoming: IncomingMessage
    outgoing: HttpServerResponse
}

export type Http2Bindings = {
    incoming: Http2ServerRequest
    outgoing: Http2ServerResponse
}

export type FetchCallback = (
    request: Request,
    env: HttpBindings | Http2Bindings,
) => Promise<unknown> | unknown

export type NextHandlerOption = {
    fetch: FetchCallback
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
    fetch: FetchCallback
    overrideGlobalObjects?: boolean
    port?: number
    hostname?: string
} & ServerOptions

export type CustomErrorHandler = (
    err: unknown,
) => void | Response | Promise<void | Response>

type JSONStub = Record<string | number | symbol, unknown>

export interface ReqContext {
    get body(): string | Buffer | JSONStub
    get bodyRaw(): string
    get bodyText(): string
    get bodyJson(): JSONStub
    get bodyBinary(): Buffer
    headers: Record<string, string>
    method: Request['method']
    host: string
    scheme: string
    query: Record<string, string>
    queryString: string
    port: number
    url: string
    path: string
}

export interface ResContext {
    send: (
        body: Stream | Buffer | string,
        statusCode: Response['status'],
        headers?: Record<string, string> | OutgoingHttpHeaders,
    ) => void
    text: (
        body: string,
        statusCode: Response['status'],
        headers?: Record<string, string> | OutgoingHttpHeaders,
    ) => void
    binary: (
        bytes: Buffer | Stream,
        statusCode: Response['status'],
        headers?: Record<string, string> | OutgoingHttpHeaders,
    ) => void
    json: (
        body: JSONStub,
        statusCode: Response['status'],
        headers?: Record<string, string>,
    ) => void
    empty: () => void
    redirect: (
        url: string,
        statusCode: Response['status'],
        headers?: Record<string, string>,
    ) => void
    start: (
        statusCode: Response['status'],
        headers?: Record<string, string> | OutgoingHttpHeaders,
    ) => void
    writeText: (body: string) => void
    writeJson: (body: JSONStub) => void
    writeBinary: (bytes: Buffer | string) => void
    end: (headers?: Record<string, string>) => void
}

export interface Context {
    req: ReqContext
    res: ResContext
    log: (message: unknown | JSONStub) => void
    error: (message: unknown | JSONStub) => void
}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // Custom process.env here
        }
    }
}
