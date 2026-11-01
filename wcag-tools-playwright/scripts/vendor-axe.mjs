// Copies axe-core into dist/vendor/ so the packed tarball works without installing dependencies.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const axeDir = path.dirname(require.resolve("axe-core/package.json"));
const out = new URL("../dist/vendor/", import.meta.url);
mkdirSync(out, { recursive: true });
copyFileSync(path.join(axeDir, "axe.min.js"), new URL("axe.min.js", out));
copyFileSync(path.join(axeDir, "LICENSE"), new URL("axe-core.LICENSE", out));
