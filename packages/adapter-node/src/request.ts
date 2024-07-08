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
    constructor(input: string | Request, options?: RequestInit) {
        if (typeof input === 'object' && getRequestCache in input) {
            // biome-ignore lint/style/noParameterAssign: Saving memory by just reassigning
            input = (input as typeof requestPrototype)[getRequestCache]()
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
    const init = {
        method,
        headers: incoming.headers,
        signal: abortController.signal,
    } as RequestInit

    return new Request(url, init)
}

const requestPrototype: Record<string | symbol, any> = {
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
        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
        return (this[requestCache] ||= newRequestFromIncoming(
            // biome-ignore lint/complexity/useLiteralKeys: <explanation>
            this['method'],
            this[urlKey],
            this[incomingKey],
            this[abortControllerKey],
        ))
    },
}

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
): Request | GlobalRequestType => {
    const req = Object.create(requestPrototype)
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
