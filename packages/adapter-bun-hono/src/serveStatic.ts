import { join } from 'node:path'
import type { BunFile } from 'bun'
import type { Context } from 'hono'
import type { Env, MiddlewareHandler } from 'hono/types'
import {
    getFilePath,
    getFilePathWithoutDefaultDocument,
} from 'hono/utils/filepath'
import { getMimeType } from 'hono/utils/mime'
import { isOpenRuntimes, openRuntimeRoot } from './utils'

export type ServeStaticOptions<E extends Env = Env> = {
    root?: string
    path?: string
    mimes?: Record<string, string>
    rewriteRequestPath?: (path: string) => string
    onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

export type Data = string | ArrayBuffer | ReadableStream | BunFile

const DEFAULT_DOCUMENT = 'index.html'
const defaultPathResolve = (path: string) => path

/**
 * This middleware is not directly used by the user.
 * Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const baseServeStatic = <E extends Env = Env>(
    options: ServeStaticOptions<E> & {
        getContent: (
            path: string,
            c: Context<E>,
        ) => Promise<Data | Response | null>
        pathResolve?: (path: string) => string
    },
): MiddlewareHandler => {
    const normalizedRoot = isOpenRuntimes
        ? join(openRuntimeRoot, options?.root as string)
        : (options?.root as string)

    return async (c, next) => {
        // Do nothing if Response is already set
        if (c.finalized) {
            await next()
            return
        }

        let filename = options.path ?? decodeURI(c.req.path)
        filename = options.rewriteRequestPath
            ? options.rewriteRequestPath(filename)
            : filename
        const root = normalizedRoot

        let path = getFilePath({
            filename,
            root,
            defaultDocument: DEFAULT_DOCUMENT,
        })

        if (!path) {
            return await next()
        }

        const getContent = options.getContent
        const pathResolve = options.pathResolve ?? defaultPathResolve

        path = pathResolve(path)
        let content = await getContent(path, c)

        if (!content) {
            let pathWithOutDefaultDocument = getFilePathWithoutDefaultDocument({
                filename,
                root,
            })
            if (!pathWithOutDefaultDocument) {
                return await next()
            }
            pathWithOutDefaultDocument = pathResolve(pathWithOutDefaultDocument)

            if (pathWithOutDefaultDocument !== path) {
                content = await getContent(pathWithOutDefaultDocument, c)
                if (content) {
                    path = pathWithOutDefaultDocument
                }
            }
        }

        if (content instanceof Response) {
            return c.newResponse(content.body, content)
        }

        if (content) {
            let mimeType: string | undefined
            if (options.mimes) {
                mimeType = getMimeType(path, options.mimes) ?? getMimeType(path)
            } else {
                mimeType = getMimeType(path)
            }
            if (mimeType) {
                c.header('Content-Type', mimeType)
            }

            if (content instanceof Blob) {
                return c.body(content.stream())
            }

            return c.body(content)
        }

        await options.onNotFound?.(path, c)
        await next()
        return
    }
}

export const serveStatic = <E extends Env = Env>(
    options: ServeStaticOptions<E>,
): MiddlewareHandler => {
    return async function serveStatic(c, next) {
        const getContent = async (path: string) => {
            path = `./${path}`
            const file = Bun.file(path)
            return (await file.exists()) ? file : null
        }
        const pathResolve = (path: string) => {
            return `./${path}`
        }
        return baseServeStatic({
            ...options,
            getContent,
            pathResolve,
        })(c, next)
    }
}
