/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import mobxReactPlugin from "mobx-react-plugin/vite"

export default defineConfig({
    plugins: [
        // 1. Automatic observer + "use no memo". `enforce: "pre"`, so it runs before
        //    every other plugin, in particular before React Compiler.
        //    Transform policy of the demo:
        //      src/protected/** -> automatically observed + "use no memo"
        //      src/controls/**  -> deliberately excluded: the manual observer stays broken
        //      src/pure/**      -> excluded: React Compiler optimizes it normally
        mobxReactPlugin({ include: ["src/protected/**"] }),
        // 2. React (Fast Refresh in dev).
        react(),
        // 3. React Compiler with its default configuration (babel-plugin-react-compiler 1.0.0).
        babel({ presets: [reactCompilerPreset()] })
    ],
    test: {
        environment: "jsdom",
        include: ["tests/**/*.spec.{ts,tsx}"]
    }
})
