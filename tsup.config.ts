import { defineConfig } from "tsup"

export default defineConfig({
    entry: ["packages/**/*.{ts,tsx}"],
    splitting: false,
    sourcemap: true,
    clean: true,
    experimentalDts: true,
})
