import { defineConfig, type Options } from "tsup"
import { utimes } from "node:fs"

export const shared = (config?: Options | Options[]) =>
    defineConfig({
        entry: ["src/**/*.{ts,tsx}"],
        splitting: false,
        sourcemap: true,
        clean: true,
        ...config,
    })
