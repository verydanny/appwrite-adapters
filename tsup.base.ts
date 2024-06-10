import { defineConfig, type Options } from 'tsup'

export const shared = (config: Options | Options[]) => defineConfig({
    entry: ["packages/**/*.{ts,tsx}"],
    splitting: false,
    sourcemap: true,
    clean: true,
    experimentalDts: true,
    ...config
})
