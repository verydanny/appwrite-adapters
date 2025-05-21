import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'

import type { ReadableStream } from 'node:stream/web'
import type { Headers as UndiciHeaders } from 'undici-types'
import type { OutgoingHeaders } from './types.ts'

export const openRuntimeRoot = 'src/function'
export const isOpenRuntimes = existsSync(
    resolve(process.cwd(), openRuntimeRoot),
)

export async function streamToBuffer(
    readableStream: ReadableStream<Uint8Array>,
) {
    if (readableStream.locked) {
        throw new TypeError('ReadableStream is locked.')
    }

    const reader = readableStream.getReader()

    async function readChunks(accumulator: Uint8Array[] = []) {
        const { done, value } = await reader.read()

        if (done) {
            return Buffer.concat(accumulator)
        }

        accumulator.push(Buffer.from(value))

        return readChunks(accumulator)
    }

    return readChunks()
}

export async function nodeWebStreamToBuffer(
    webReadableStream: ReadableStream<Uint8Array>,
) {
    const nodeReadable = Readable.from(webReadableStream)

    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Uint8Array[] = []

        nodeReadable.on('data', (chunk) => chunks.push(chunk))
        nodeReadable.on('end', () => resolve(Buffer.concat(chunks)))
        nodeReadable.on('error', reject)
        nodeReadable.on('close', resolve)
    })
}

/** @todo Implement in Version 2.0.0+ */
// export async function writeFromReadableStream(
//     stream: ReadableStream<Uint8Array>,
//     writable: Context['res'],
// ) {
//     if (stream.locked) {
//         throw new TypeError('ReadableStream is locked.')
//     }

//     const reader = stream.getReader()

//     try {
//         while (true) {
//             const { done, value } = await reader.read()

//             if (done) {
//                 break
//             }

//             if (value) {
//                 const buffer = Buffer.from(value)

//                 writable.writeBinary(buffer)
//             }
//         }
//     } finally {
//         reader.releaseLock()
//         writable.end()
//     }
// }

export const buildOutgoingHttpHeaders = (
    headers: UndiciHeaders,
): OutgoingHeaders => {
    const res: OutgoingHeaders = {}

    const cookies = []
    for (const [k, v] of headers) {
        if (k === 'set-cookie') {
            cookies.push(v)
        } else {
            res[k] = v
        }
    }
    if (cookies.length > 0) {
        res['set-cookie'] = cookies
    }
    res['content-type'] ??= 'text/plain; charset=UTF-8'

    return res
}

function forEachU<A>(a: A[], f: (arg: A) => void) {
    for (let i = 0, i_finish = a.length; i < i_finish; ++i) {
        f(a[i] as A)
    }
}

export function forEach<const A>(xs: A[], fn: (_1: A) => void): void
export function forEach<const A>(fn: (_1: A) => void): (xs: A[]) => void
export function forEach<const A>() {
    if (arguments.length === 1) {
        const args = arguments
        return function fn(data: A[]) {
            return forEachU(data, args[0])
        }
    }
    return forEachU(arguments[0], arguments[1])
}
