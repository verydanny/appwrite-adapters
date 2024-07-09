import type { Stream } from 'node:stream'

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
        headers?: Record<string, string>,
    ) => void
    text: (
        body: string,
        statusCode: Response['status'],
        headers?: Record<string, string>,
    ) => void
    binary: (
        bytes: Buffer | Stream,
        statusCode: Response['status'],
        headers?: Record<string, string>,
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
        headers?: Record<string, string>,
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
