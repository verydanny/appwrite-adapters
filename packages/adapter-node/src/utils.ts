import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
// import { finished } from "node:stream/promises"
import { Readable } from 'node:stream'

import type { OutgoingHttpHeaders } from 'node:http'
import type { ReadableStream } from 'node:stream/web'
import type { Context } from './types.ts'

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

export async function writeFromReadableStream(
    stream: ReadableStream<Uint8Array>,
    writable: Context['res'],
) {
    if (stream.locked) {
        throw new TypeError('ReadableStream is locked.')
    }

    const reader = stream.getReader()

    try {
        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                break
            }

            if (value) {
                const buffer = Buffer.from(value)

                writable.writeBinary(buffer)
            }
        }
    } finally {
        reader.releaseLock()
        writable.end()
    }
}

export const buildOutgoingHttpHeaders = (
    headers: Response['headers'],
): OutgoingHttpHeaders => {
    const res: OutgoingHttpHeaders = {}

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
