import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

export const openRuntimeRoot = 'src/function'
export const isOpenRuntimes = existsSync(
    resolve(process.cwd(), openRuntimeRoot),
)
