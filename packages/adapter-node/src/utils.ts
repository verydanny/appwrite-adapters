import type { OutgoingHttpHeaders } from "node:http"
import type { Context } from "./types.ts"

export async function writeFromReadableStream(
    stream: ReadableStream<Uint8Array>,
    writable: Context["res"],
) {
    if (stream.locked) {
        throw new TypeError("ReadableStream is locked.")
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
    headers: Response["headers"],
): OutgoingHttpHeaders => {
    const res: OutgoingHttpHeaders = {}

    const cookies = []
    for (const [k, v] of headers) {
        if (k === "set-cookie") {
            cookies.push(v)
        } else {
            res[k] = v
        }
    }
    if (cookies.length > 0) {
        res["set-cookie"] = cookies
    }
    res["content-type"] ??= "text/plain; charset=UTF-8"

    return res
}
