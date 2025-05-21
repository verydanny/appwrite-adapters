import type { ReadableStream } from 'node:stream/web'
import type {
    Request as UndiciRequest,
    RequestInit as UndiciRequestInit,
} from 'undici-types'
import type { ReqContext } from './types.ts'
import { forEach } from './utils.ts'

export class RequestError extends Error {
    static override name = 'RequestError'
    constructor(
        message: string,
        options?: {
            cause?: unknown
        },
    ) {
        super(message, options)
    }
}

export const toRequestError = (e: unknown): RequestError => {
    if (e instanceof RequestError) {
        return e
    }
    return new RequestError((e as Error).message, { cause: e })
}

interface NodeRequestConstructor {
    new (input: string | UndiciRequest, init?: UndiciRequestInit): UndiciRequest
    prototype: UndiciRequest
}

export const GlobalRequest = global.Request as NodeRequestConstructor
export class Request extends GlobalRequest {
    constructor(input: string | RequestPrototype, options?: UndiciRequestInit) {
        if (
            typeof input === 'object' &&
            getRequestCache in input &&
            typeof input[getRequestCache]() !== 'undefined'
        ) {
            input = input[getRequestCache]() as RequestPrototype
        }
        // Check if body is ReadableStream like. This makes it compatbile with ReadableStream polyfills.
        if (
            typeof (options?.body as ReadableStream)?.getReader !== 'undefined'
        ) {
            // node 18 fetch needs half duplex mode when request body is stream
            // if already set, do nothing since a Request object was passed to the options or explicitly set by the user.
            ;(
                options as UndiciRequestInit & { duplex?: 'half' | 'full' }
            ).duplex ??= 'half'
        }
        super(input, options)
    }
}

export const getAbortController = Symbol('getAbortController')
export const getRequestCache = Symbol('getRequestCache')
const requestCache = Symbol('requestCache')
const incomingKey = Symbol('incomingKey')
const urlKey = Symbol('urlKey')
const abortControllerKey = Symbol('abortControllerKey')

const newRequestFromIncoming = (
    method: string,
    url: string,
    incoming: ReqContext,
    abortController: AbortController,
) => {
    const init: UndiciRequestInit = {
        method,
        headers: incoming.headers,
        signal: abortController.signal,
        body: null,
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

    if (!(method === 'GET' || method === 'HEAD') && incoming.body) {
        if (incoming.bodyBinary instanceof Buffer) {
            init.body = incoming.bodyBinary
        } else {
            init.body = incoming.bodyRaw ?? null
        }
    }

    return new Request(url, init)
}

export interface RequestPrototype extends UndiciRequest {
    [incomingKey]: ReqContext
    [urlKey]: string
    [abortControllerKey]: AbortController
    [requestCache]: Request | UndiciRequest

    get method(): string
    get url(): string

    [getAbortController](): AbortController
    [getRequestCache](): Request | UndiciRequest
}

const requestPrototype = {
    get method() {
        return this[incomingKey].method || 'GET'
    },

    get url() {
        return this[urlKey]
    },

    [getAbortController]() {
        this[getRequestCache]()

        return this[abortControllerKey]
    },

    [getRequestCache]() {
        this[abortControllerKey] ||= new AbortController()

        return (this[requestCache] ||= newRequestFromIncoming(
            this.method,
            this.url,
            this[incomingKey],
            this[abortControllerKey],
        ))
    },
} as RequestPrototype

forEach(
    [
        'body',
        'bodyUsed',
        'cache',
        'credentials',
        'destination',
        'headers',
        'integrity',
        'mode',
        'redirect',
        'referrer',
        'referrerPolicy',
        'signal',
        'keepalive',
    ],
    (k) => {
        Object.defineProperty(requestPrototype, k, {
            get() {
                return this[getRequestCache]()[k]
            },
        })
    },
)

forEach(['arrayBuffer', 'blob', 'clone', 'formData', 'json', 'text'], (k) => {
    Object.defineProperty(requestPrototype, k, {
        value: function () {
            return this[getRequestCache]()[k]()
        },
    })
})

Object.setPrototypeOf(requestPrototype, Request.prototype)

export const newRequest = (incoming: ReqContext, defaultHostname?: string) => {
    const req: RequestPrototype = Object.create(requestPrototype)
    req[incomingKey] = incoming

    const host = incoming.host || defaultHostname

    if (!host) {
        throw new RequestError('Missing host header')
    }

    if (!incoming.url) {
        throw new RequestError('Missing URL')
    }

    const url = new URL(incoming.url)

    if (
        url.hostname.length !== host.length &&
        url.hostname !== host.replace(/:\d+$/, '')
    ) {
        throw new RequestError('Invalid host header')
    }

    req[urlKey] = url.href

    return req
}
