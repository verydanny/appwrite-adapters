import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const openRuntimeRoot = 'src/function'
export const isOpenRuntimes = existsSync(
    resolve(process.cwd(), openRuntimeRoot),
)
