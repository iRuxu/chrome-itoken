import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../src/", import.meta.url));
const dist = fileURLToPath(new URL("../dist/", import.meta.url));

mkdirSync(dist, { recursive: true });
const temporaryDir = mkdtempSync(join(dist, ".build-"));
const archive = join(temporaryDir, "itoken-iruxu.zip");

try {
    execFileSync("zip", [
        "-q", "-X", "-r", archive, ".",
        "-x", "*.DS_Store", "__MACOSX/*", "*/__MACOSX/*"
    ], { cwd: src, stdio: "inherit" });
    renameSync(archive, join(dist, "itoken-iruxu.zip"));
    console.log("已生成 dist/itoken-iruxu.zip");
} finally {
    rmSync(temporaryDir, { recursive: true, force: true });
}
