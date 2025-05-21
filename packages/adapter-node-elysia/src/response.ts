// Define lightweight pseudo Response class and replace global.Response with it.

import type {
    BodyInit,
    Response as GlobalResponseType,
    ResponseInit,
} from 'undici-types'
import type { OutgoingHeaders, StatusCode } from './types.ts'
import { buildOutgoingHttpHeaders, forEach } from './utils.ts'

interface InternalBody {
    source: string | Uint8Array | FormData | Blob | null
    stream: ReadableStream
    length: number | null
}

export const cacheKey = Symbol('cache')

interface NodeResponseConstructor {
    new (body?: BodyInit | null, init?: ResponseInit): GlobalResponseType
    prototype: GlobalResponseType
}

export const GlobalResponse = global.Response as NodeResponseConstructor

const responseCache = Symbol('responseCache')
const getResponseCache = Symbol('getResponseCache')

export interface Response extends GlobalResponseType {}
export class Response {
    #body?: BodyInit | null
    #init?: ResponseInit;

    [cacheKey]?: [StatusCode, BodyInit, OutgoingHeaders];
    [responseCache]?: GlobalResponseType;

    [getResponseCache]() {
        delete this[cacheKey]

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
            }) as OutgoingHeaders

            if (headers instanceof Headers) {
                headers = buildOutgoingHttpHeaders(headers)
            }

            this[cacheKey] = [
                (init?.status as StatusCode) || 200,
                body,
                headers,
            ]
        }
    }
}

forEach(
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

forEach(
    ['arrayBuffer', 'blob', 'clone', 'formData', 'json', 'text'] as const,
    (k) => {
        Object.defineProperty(Response.prototype, k, {
            value: function (this: Response) {
                return this[getResponseCache]()[k]()
            },
        })
    },
)

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
        response = response[getResponseCache]()
    }

    const state = (response as any)[stateKey] as
        | { body?: InternalBody }
        | undefined

    return state?.body || undefined
}
