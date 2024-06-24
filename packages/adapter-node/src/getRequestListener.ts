import { Http2ServerRequest } from "node:http2"
// import { Readable } from "node:stream"
import type { ReadableStream } from "node:stream/web"
// import type { TLSSocket } from "node:tls"
import type {
    Context,
    CustomErrorHandler,
    FetchCallback,
    HttpBindings,
    ReqContext,
    ResContext,
} from "./types.js"

export class RequestError extends Error {
    static override name = "RequestError"
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
        if (typeof input === "object" && getRequestCache in input) {
            input = (input as any)[getRequestCache]()
        }
        // Check if body is ReadableStream like. This makes it compatbile with ReadableStream polyfills.
        if (
            typeof (options?.body as ReadableStream)?.getReader !== "undefined"
        ) {
            // node 18 fetch needs half duplex mode when request body is stream
            // if already set, do nothing since a Request object was passed to the options or explicitly set by the user.
            ;(options as any).duplex ??= "half"
        }
        super(input, options)
    }
}

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

const getRequestCache = Symbol("getRequestCache")
const requestCache = Symbol("requestCache")
const incomingKey = Symbol("incomingKey")
const urlKey = Symbol("urlKey")
const abortControllerKey = Symbol("abortControllerKey")
export const getAbortController = Symbol("getAbortController")

const requestPrototype: Record<string | symbol, any> = {
    get method() {
        return this[incomingKey].method || "GET"
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
            this["method"],
            this[urlKey],
            this[incomingKey],
            this[abortControllerKey],
        ))
    },
}
// biome-ignore lint/complexity/noForEach: <explanation>
;[
    "body",
    "bodyUsed",
    "cache",
    "credentials",
    "destination",
    "headers",
    "integrity",
    "mode",
    "redirect",
    "referrer",
    "referrerPolicy",
    "signal",
    "keepalive",
].forEach((k) => {
    Object.defineProperty(requestPrototype, k, {
        get() {
            return this[getRequestCache]()[k]
        },
    })
})
// biome-ignore lint/complexity/noForEach: <explanation>
;["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
    Object.defineProperty(requestPrototype, k, {
        value: function () {
            return this[getRequestCache]()[k]()
        },
    })
})
Object.setPrototypeOf(requestPrototype, Request.prototype)

export const newRequest = (incoming: ReqContext, defaultHostname?: string) => {
    const req = Object.create(requestPrototype)
    req[incomingKey] = incoming

    const host =
        (incoming instanceof Http2ServerRequest
            ? incoming.authority
            : incoming.host) || defaultHostname

    if (!host) {
        throw new RequestError("Missing host header")
    }

    if (!incoming.url) {
        throw new RequestError("Missing URL")
    }

    const url = new URL(
        incoming.url,
    )

    if (
        url.hostname.length !== host.length &&
        url.hostname !== host.replace(/:\d+$/, "")
    ) {
        throw new RequestError("Invalid host header")
    }

    req[urlKey] = url.href

    return req
}

// function writeFromReadableStream(stream, writable) {
//   if (stream.locked) {
//     throw new TypeError("ReadableStream is locked.");
//   } else if (writable.destroyed) {
//     stream.cancel();
//     return;
//   }
//   const reader = stream.getReader();
//   writable.on("close", cancel);
//   writable.on("error", cancel);
//   reader.read().then(flow, cancel);
//   return reader.closed.finally(() => {
//     writable.off("close", cancel);
//     writable.off("error", cancel);
//   });
//   function cancel(error) {
//     reader.cancel(error).catch(() => {
//     });
//     if (error) {
//       writable.destroy(error);
//     }
//   }
//   function onDrain() {
//     reader.read().then(flow, cancel);
//   }
//   function flow({ done, value }) {
//     try {
//       if (done) {
//         writable.end();
//       } else if (!writable.write(value)) {
//         writable.once("drain", onDrain);
//       } else {
//         return reader.read().then(flow, cancel);
//       }
//     } catch (e) {
//       cancel(e);
//     }
//   }
// }
// var buildOutgoingHttpHeaders = (headers) => {
//   const res = {};
//   const cookies = [];
//   for (const [k, v] of headers) {
//     if (k === "set-cookie") {
//       cookies.push(v);
//     } else {
//       res[k] = v;
//     }
//   }
//   if (cookies.length > 0) {
//     res["set-cookie"] = cookies;
//   }
//   res["content-type"] ??= "text/plain; charset=UTF-8";
//   return res;
// };

// var responseCache = Symbol("responseCache");
// var getResponseCache = Symbol("getResponseCache");
// var cacheKey = Symbol("cache");
// var GlobalResponse = global.Response;
// var Response2 = class _Response {
//   #body;
//   #init;
//   [getResponseCache]() {
//     delete this[cacheKey];
//     return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
//   }
//   constructor(body, init) {
//     this.#body = body;
//     if (init instanceof _Response) {
//       const cachedGlobalResponse = init[responseCache];
//       if (cachedGlobalResponse) {
//         this.#init = cachedGlobalResponse;
//         this[getResponseCache]();
//         return;
//       } else {
//         this.#init = init.#init;
//       }
//     } else {
//       this.#init = init;
//     }
//     if (typeof body === "string" || typeof body?.getReader !== "undefined") {
//       let headers = init?.headers || { "content-type": "text/plain; charset=UTF-8" };
//       if (headers instanceof Headers) {
//         headers = buildOutgoingHttpHeaders(headers);
//       }
//       ;
//       this[cacheKey] = [init?.status || 200, body, headers];
//     }
//   }
// };

// [
//   "body",
//   "bodyUsed",
//   "headers",
//   "ok",
//   "redirected",
//   "status",
//   "statusText",
//   "trailers",
//   "type",
//   "url"
// ].forEach((k) => {
//   Object.defineProperty(Response2.prototype, k, {
//     get() {
//       return this[getResponseCache]()[k];
//     }
//   });
// });
// ["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
//   Object.defineProperty(Response2.prototype, k, {
//     value: function() {
//       return this[getResponseCache]()[k]();
//     }
//   });
// });
// Object.setPrototypeOf(Response2, GlobalResponse);
// Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
// var stateKey = Reflect.ownKeys(new GlobalResponse()).find(
//   (k) => typeof k === "symbol" && k.toString() === "Symbol(state)"
// );
// if (!stateKey) {
//   console.warn("Failed to find Response internal state key");
// }
// function getInternalBody(response) {
//   if (!stateKey) {
//     return;
//   }
//   if (response instanceof Response2) {
//     response = response[getResponseCache]();
//   }
//   const state = response[stateKey];
//   return state && state.body || void 0;
// }

// // src/utils/response/constants.ts
// var X_ALREADY_SENT = "x-hono-already-sent";

// // src/globals.ts
// import crypto from "crypto";
// var webFetch = global.fetch;
// if (typeof global.crypto === "undefined") {
//   global.crypto = crypto;
// }
// global.fetch = (info, init) => {
//   init = {
//     // Disable compression handling so people can return the result of a fetch
//     // directly in the loader without messing with the Content-Encoding header.
//     compress: false,
//     ...init
//   };
//   return webFetch(info, init);
// };

// // src/listener.ts
// var regBuffer = /^no$/i;
// var regContentType = /^(application\/json\b|text\/(?!event-stream\b))/i;
// var handleRequestError = () => new Response(null, {
//   status: 400
// });
// var handleFetchError = (e) => new Response(null, {
//   status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
// });
// var handleResponseError = (e, outgoing) => {
//   const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
//   if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
//     console.info("The user aborted a request.");
//   } else {
//     console.error(e);
//     if (!outgoing.headersSent) {
//       outgoing.writeHead(500, { "Content-Type": "text/plain" });
//     }
//     outgoing.end(`Error: ${err.message}`);
//     outgoing.destroy(err);
//   }
// };
// var responseViaCache = (res, outgoing) => {
//   const [status, body, header] = res[cacheKey];
//   if (typeof body === "string") {
//     header["Content-Length"] = Buffer.byteLength(body);
//     outgoing.writeHead(status, header);
//     outgoing.end(body);
//   } else {
//     outgoing.writeHead(status, header);
//     return writeFromReadableStream(body, outgoing)?.catch(
//       (e) => handleResponseError(e, outgoing)
//     );
//   }
// };
// var responseViaResponseObject = async (res, outgoing, options = {}) => {
//   if (res instanceof Promise) {
//     if (options.errorHandler) {
//       try {
//         res = await res;
//       } catch (err) {
//         const errRes = await options.errorHandler(err);
//         if (!errRes) {
//           return;
//         }
//         res = errRes;
//       }
//     } else {
//       res = await res.catch(handleFetchError);
//     }
//   }
//   if (cacheKey in res) {
//     return responseViaCache(res, outgoing);
//   }
//   const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
//   const internalBody = getInternalBody(res);
//   if (internalBody) {
//     if (internalBody.length) {
//       resHeaderRecord["content-length"] = internalBody.length;
//     }
//     outgoing.writeHead(res.status, resHeaderRecord);
//     if (typeof internalBody.source === "string" || internalBody.source instanceof Uint8Array) {
//       outgoing.end(internalBody.source);
//     } else if (internalBody.source instanceof Blob) {
//       outgoing.end(new Uint8Array(await internalBody.source.arrayBuffer()));
//     } else {
//       await writeFromReadableStream(internalBody.stream, outgoing);
//     }
//   } else if (res.body) {
//     const {
//       "transfer-encoding": transferEncoding,
//       "content-encoding": contentEncoding,
//       "content-length": contentLength,
//       "x-accel-buffering": accelBuffering,
//       "content-type": contentType
//     } = resHeaderRecord;
//     if (transferEncoding || contentEncoding || contentLength || // nginx buffering variant
//     accelBuffering && regBuffer.test(accelBuffering) || !regContentType.test(contentType)) {
//       outgoing.writeHead(res.status, resHeaderRecord);
//       await writeFromReadableStream(res.body, outgoing);
//     } else {
//       const buffer = await res.arrayBuffer();
//       resHeaderRecord["content-length"] = buffer.byteLength;
//       outgoing.writeHead(res.status, resHeaderRecord);
//       outgoing.end(new Uint8Array(buffer));
//     }
//   } else if (resHeaderRecord[X_ALREADY_SENT]) {
//   } else {
//     outgoing.writeHead(res.status, resHeaderRecord);
//     outgoing.end();
//   }
// };

export const getRequestListener = (
    fetchCallback: FetchCallback,
    options: {
        hostname?: string
        errorHandler?: CustomErrorHandler
        overrideGlobalObjects?: boolean
    } = {},
) => {
    if (options.overrideGlobalObjects !== false && global.Request !== Request) {
        Object.defineProperty(global, "Request", {
            value: Request,
        })
        // Object.defineProperty(global, "Response", {
        //   value: Response2
        // });
    }

    return (errorHandler?: Context["error"]) => {
        return async (incoming: ReqContext, outgoing: ResContext) => {
            let res, req

            try {
                req = newRequest(incoming, options.hostname)
                res = fetchCallback(req, {
                    incoming,
                    outgoing,
                } as unknown as HttpBindings) as Response | Promise<Response>

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
