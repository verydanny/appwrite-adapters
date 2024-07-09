// Define lightweight pseudo Response class and replace global.Response with it.
import { A } from '@mobily/ts-belt'
import { buildOutgoingHttpHeaders } from './utils.ts'

import type { OutgoingHttpHeaders } from 'node:http'
import type { Response as GlobalResponseType, BodyInit } from 'undici-types'

interface InternalBody {
    source: string | Uint8Array | FormData | Blob | null
    stream: ReadableStream
    length: number | null
}

export const cacheKey = Symbol('cache')
export const GlobalResponse = global.Response

const responseCache = Symbol('responseCache')
const getResponseCache = Symbol('getResponseCache')


export interface Response extends GlobalResponseType {}
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: We're overriding existing classes, should be good
export class Response {
    #body?: BodyInit | null
    #init?: ResponseInit;

    [cacheKey]?: [
        number,
        BodyInit,
        Record<string, string> | OutgoingHttpHeaders,
    ];
    [responseCache]?: GlobalResponseType;

    [getResponseCache]() {
        delete this[cacheKey]

        // biome-ignore lint/suspicious/noAssignInExpressions: Easier to type knowing it will always be GlobalResponseType
        return (this[responseCache] ||= new GlobalResponse(
            this.#body,
            this.#init,
        ))
    }

    constructor(body: BodyInit | null, init: ResponseInit | Response) {
        this.#body = body

        if (init instanceof Response) {
            const cachedGlobalResponse = init[responseCache]

            if (cachedGlobalResponse) {
                this.#init = cachedGlobalResponse
                // instantiate GlobalResponse cache and this object always returns value from global.Response
                this[getResponseCache]()
                return
            }

            if (init.#init) {
                this.#init = init.#init
            }
        } else {
            this.#init = init
        }

        if (
            typeof body === 'string' ||
            typeof (body as ReadableStream)?.getReader !== 'undefined'
        ) {
            let headers = (init?.headers || {
                'content-type': 'text/plain; charset=UTF-8',
            }) as Record<string, string> | Headers | OutgoingHttpHeaders

            if (headers instanceof Headers) {
                headers = buildOutgoingHttpHeaders(headers)
            }
            this[cacheKey] = [
                init?.status || 200,
                body,
                headers,
            ]
        }
    }
}

A.forEach(
    [
        'body',
        'bodyUsed',
        'headers',
        'ok',
        'redirected',
        'status',
        'statusText',
        'trailers',
        'type',
        'url',
    ] as const,
    (k) => {
        Object.defineProperty(Response.prototype, k, {
            get(this: Response) {
                return this[getResponseCache]()[k as keyof GlobalResponseType]
            },
        })
    },
)

A.forEach(['arrayBuffer', 'blob', 'clone', 'formData', 'json', 'text'] as const, (k) => {
    Object.defineProperty(Response.prototype, k, {
        value: function (this: Response) {
            return this[getResponseCache]()[k]()
        },
    })
})

Object.setPrototypeOf(Response, GlobalResponse)
Object.setPrototypeOf(Response.prototype, GlobalResponse.prototype)

const stateKey = Reflect.ownKeys(new GlobalResponse()).find(
    (k) => typeof k === 'symbol' && k.toString() === 'Symbol(state)',
) as symbol | undefined

if (!stateKey) {
    console.warn('Failed to find Response internal state key')
}

export function getInternalBody(
    response: Response | GlobalResponseType,
): InternalBody | undefined {
    if (!stateKey) {
        return
    }

    if (response instanceof Response) {
        // biome-ignore lint/style/noParameterAssign: Saving memory by just reassigning
        response = response[getResponseCache]()
    }

    // biome-ignore lint/suspicious/noExplicitAny: Hard to type a vague symbol
    const state = (response as any)[stateKey] as
        | { body?: InternalBody }
        | undefined

    return state?.body || undefined
}
