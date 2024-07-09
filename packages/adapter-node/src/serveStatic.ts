import type { ReadStream, Stats } from 'node:fs'
import { createReadStream, lstatSync } from 'node:fs'
import type { Context, MiddlewareHandler } from 'hono'
import {
    getFilePath,
    getFilePathWithoutDefaultDocument,
} from 'hono/utils/filepath'
import { getMimeType } from 'hono/utils/mime'
import { isOpenRuntimes, openRuntimeRoot } from './utils.ts'
import { join } from 'node:path'

export type ServeStaticOptions = {
    /**
     * Root path, relative to current working directory from which the app was started. Absolute paths are not supported.
     */
    root?: string
    path?: string
    index?: string // default is 'index.html'
    rewriteRequestPath?: (path: string) => string
    onNotFound?: (path: string, c: Context) => void | Promise<void>
}

const createStreamBody = (stream: ReadStream) => {
    const body = new ReadableStream({
        start(controller) {
            stream.on('data', (chunk) => {
                controller.enqueue(chunk)
            })
            stream.on('end', () => {
                controller.close()
            })
        },

        cancel() {
            stream.destroy()
        },
    })
    return body
}

// @ts-ignore
function readStreamToBufferSafely(
    readStream: ReadStream,
    maxSize = Number.MAX_SAFE_INTEGER,
) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const chunks: Uint8Array[] = []
        let totalSize = 0

        readStream.on('data', (chunk: Buffer) => {
            totalSize += chunk.length

            if (totalSize > maxSize) {
                readStream.destroy()
                reject(
                    new Error(
                        `Stream content exceeds maximum allowed size of ${maxSize}`,
                    ),
                )
            } else {
                chunks.push(new Uint8Array(chunk))
            }
        })

        readStream.on('end', () => {
            const buffer = Buffer.concat(chunks)

            resolve(
                buffer.buffer.slice(
                    buffer.byteOffset,
                    buffer.byteOffset + buffer.byteLength,
                ) as ArrayBuffer,
            )
        })

        readStream.on('error', reject)

        readStream.on('close', resolve)
    })
}

const addCurrentDirPrefix = (path: string) => {
    return `./${path}`
}

const getStats = (path: string) => {
    let stats: Stats | undefined
    try {
        stats = lstatSync(path)
    } catch {}
    return stats
}

export const serveStatic = (options: ServeStaticOptions = { root: '' }): MiddlewareHandler => {
    return async (c, next) => {
        c.env.log(isOpenRuntimes)
        c.env.log(options?.root)
        if (isOpenRuntimes && options?.root) {
            options.root = join(openRuntimeRoot, options?.root)
            c.env.log(options.root)
        }
        
        // Do nothing if Response is already set
        if (c.finalized) {
            return next()
        }

        const filename = options.path ?? decodeURIComponent(c.req.path)

        let path = getFilePathWithoutDefaultDocument({
            filename: options.rewriteRequestPath
                ? options.rewriteRequestPath(filename)
                : filename,
            root: options?.root as string,
        })

        c.env.log(path)

        if (path) {
            path = addCurrentDirPrefix(path)
        } else {
            return next()
        }

        c.env.log(`path: ${path}`)

        let stats = getStats(path)

        if (stats?.isDirectory()) {
            path = getFilePath({
                filename: options.rewriteRequestPath
                    ? options.rewriteRequestPath(filename)
                    : filename,
                root: options?.root as string,
                defaultDocument: options.index ?? 'index.html',
            })

            if (path) {
                path = addCurrentDirPrefix(path)
            } else {
                return next()
            }

            stats = getStats(path)
        }

        if (!stats) {
            await options.onNotFound?.(path, c)
            return next()
        }

        const mimeType = getMimeType(path)
        if (mimeType) {
            c.header('Content-Type', mimeType)
        }

        const size = stats.size

        // biome-ignore lint/suspicious/noDoubleEquals: quicker comparison
        if (c.req.method == 'HEAD' || c.req.method == 'OPTIONS') {
            c.header('Content-Length', size.toString())
            c.status(200)
            return c.body(null)
        }

        const range = c.req.header('range') || ''

        if (!range) {
            c.header('Content-Length', size.toString())
            // TODO: Stream later
            const buffer = createStreamBody(createReadStream(path))
            return c.body(
                buffer,
                200,
            )
        }

        c.header('Accept-Ranges', 'bytes')
        c.header('Date', stats.birthtime.toUTCString())

        const parts = range.replace(/bytes=/, '').split('-', 2)
        const start = parts[0] ? Number.parseInt(parts[0], 10) : 0
        let end = parts[1] ? Number.parseInt(parts[1], 10) : stats.size - 1
        if (size < end - start + 1) {
            end = size - 1
        }

        const chunksize = end - start + 1
        const stream = createReadStream(path, { start, end })

        c.header('Content-Length', chunksize.toString())
        c.header('Content-Range', `bytes ${start}-${end}/${stats.size}`)

        // TODO: Stream later
        const buffer = createStreamBody(stream)
        return c.body(buffer, 206)
    }
}
