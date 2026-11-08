import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../src/", import.meta.url));
const presetFile = fileURLToPath(new URL("../preset/index.json", import.meta.url));
const dist = fileURLToPath(new URL("../dist/", import.meta.url));

mkdirSync(dist, { recursive: true });
const temporaryDir = mkdtempSync(join(dist, ".build-"));
const archive = join(temporaryDir, "itoken-iruxu.zip");

try {
    const staging = join(temporaryDir, "extension");
    cpSync(src, staging, { recursive: true });
    const presetDir = join(staging, "preset");
    mkdirSync(presetDir);
    try {
        copyFileSync(presetFile, join(presetDir, "index.json"));
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
        console.warn("未找到本地 preset/index.json，团队预设列表将为空。");
    }

    execFileSync("zip", [
        "-q", "-X", "-r", archive, ".",
        "-x", "*.DS_Store", "__MACOSX/*", "*/__MACOSX/*"
    ], { cwd: staging, stdio: "inherit" });
    renameSync(archive, join(dist, "itoken-iruxu.zip"));
    console.log("已生成 dist/itoken-iruxu.zip");
} finally {
    rmSync(temporaryDir, { recursive: true, force: true });
}
