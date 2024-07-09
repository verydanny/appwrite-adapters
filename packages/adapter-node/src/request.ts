import { A } from '@mobily/ts-belt'

import type { Request as GlobalRequestType } from 'undici-types'
import type { ReadableStream } from 'node:stream/web'
import type { ReqContext } from './types.js'

export class RequestError extends Error {
    static override name = 'RequestError'
    // biome-ignore lint/complexity/noUselessConstructor: <explanation>
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

export const GlobalRequest = global.Request
export class Request extends GlobalRequest {
    constructor(input: string | RequestPrototype, options?: RequestInit) {
        if (
            typeof input === 'object' &&
            getRequestCache in input &&
            typeof input[getRequestCache]() !== 'undefined'
        ) {
            // biome-ignore lint/style/noParameterAssign: Saving memory by just reassigning
            input = input[getRequestCache]() as RequestPrototype
        }
        // Check if body is ReadableStream like. This makes it compatbile with ReadableStream polyfills.
        if (
            typeof (options?.body as ReadableStream)?.getReader !== 'undefined'
        ) {
            // node 18 fetch needs half duplex mode when request body is stream
            // if already set, do nothing since a Request object was passed to the options or explicitly set by the user.
            ;(options as RequestInit & { duplex?: 'half' | 'full' }).duplex ??=
                'half'
        }
        super(input, options)
    }
}

export const getAbortController = Symbol('getAbortController')
const getRequestCache = Symbol('getRequestCache')
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
    const init: RequestInit = {
        method,
        headers: incoming.headers,
        signal: abortController.signal,
    }

    if (method === 'TRACE') {
        init.method = 'GET'
        const req = new Request(url, init)

        Object.defineProperty(req, 'method', {
            get() {
                return 'TRACE'
            }
        })

        return req
    }

    return new Request(url, init)
}

export interface RequestPrototype extends GlobalRequestType {
    [incomingKey]: ReqContext
    [urlKey]: string
    [abortControllerKey]: AbortController
    [requestCache]: Request | GlobalRequestType

    get method(): string
    get url(): string

    [getAbortController](): AbortController
    [getRequestCache](): Request | GlobalRequestType
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
        // biome-ignore lint/suspicious/noAssignInExpressions: Saving memory
        return (this[requestCache] ||= newRequestFromIncoming(
            this.method,
            this.url,
            this[incomingKey],
            this[abortControllerKey],
        ))
    },
} as RequestPrototype

A.forEach(
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

A.forEach(['arrayBuffer', 'blob', 'clone', 'formData', 'json', 'text'], (k) => {
    Object.defineProperty(requestPrototype, k, {
        value: function () {
            return this[getRequestCache]()[k]()
        },
    })
})

Object.setPrototypeOf(requestPrototype, Request.prototype)

export const newRequest = (
    incoming: ReqContext,
    defaultHostname?: string,
) => {
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
