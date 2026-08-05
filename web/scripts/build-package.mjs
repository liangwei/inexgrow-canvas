import { copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webDir, "..");

await build({ configFile: resolve(webDir, "vite.package.config.ts") });
await copyFile(
    resolve(webDir, "src/embedded/public-types.d.ts"),
    resolve(repositoryRoot, "dist/index.d.ts"),
);
