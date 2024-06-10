import { defineConfig, type Options } from "tsup"
import { utimes } from "node:fs"

export const shared = (config?: Options | Options[]) =>
    defineConfig({
        entry: ["src/**/*.{ts,tsx}"],
        splitting: false,
        sourcemap: true,
        clean: true,
        async onSuccess() {
            if (process.env.npm_lifecycle_event === "dev") {
                const time = new Date()
                utimes(
                    "../../path-to-the/app-needs-to-rebuild/src/index.tsx",
                    time,
                    time,
                    () => {},
                )
            }
        },
        ...config,
    })
