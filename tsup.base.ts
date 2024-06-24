import { type Options, defineConfig } from "tsup"

export const shared = (config?: Options | Options[]) =>
    defineConfig({
        entry: ["src/**/*.{ts,tsx}"],
        splitting: false,
        sourcemap: true,
        clean: true,
        ...config,
    })
