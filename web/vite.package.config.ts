import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { parseChangelog } from "./src/lib/release";

const webDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(webDir, "..");
const localVersion = readFileSync(resolve(repositoryRoot, "VERSION"), "utf8").trim() || "dev";
const localChangelog = readFileSync(resolve(repositoryRoot, "CHANGELOG.md"), "utf8");

const external = (id: string) =>
    id === "react" ||
    id.startsWith("react/") ||
    id === "react-dom" ||
    id.startsWith("react-dom/") ||
    id === "antd" ||
    id.startsWith("antd/");

export default defineConfig({
    publicDir: false,
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(webDir, "src"),
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(localVersion),
        __APP_RELEASES__: JSON.stringify(parseChangelog(localChangelog)),
    },
    build: {
        outDir: resolve(repositoryRoot, "dist"),
        emptyOutDir: true,
        cssCodeSplit: false,
        sourcemap: true,
        lib: {
            entry: resolve(webDir, "src/embedded/index.tsx"),
            formats: ["es"],
            fileName: "index",
            cssFileName: "styles",
        },
        rollupOptions: {
            external,
            output: {
                banner: "/*! Derived from basketikun/infinite-canvas; licensed under AGPL-3.0-only. */",
            },
        },
    },
});
