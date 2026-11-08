document.addEventListener("DOMContentLoaded", () => {
    const remoteUrlInput = document.getElementById("rssUrl");
    const fetchRemoteBtn = document.getElementById("rssBtn");
    const fileInput = document.getElementById("configFile");
    const saveBtn = document.getElementById("saveBtn");
    const status = document.getElementById("status");
    const extensionStorage = globalThis.chrome?.storage?.local;
    const previewKey = "itoken-preview-config";
    const fields = {
        fromHost: document.getElementById("fromHost"),
        toHost: document.getElementById("toHost"),
        localStorageKeys: document.getElementById("localStorageKeys"),
        cookieKeys: document.getElementById("cookieKeys"),
        corsHost: document.getElementById("corsHost")
    };

    function readConfig() {
        return Object.fromEntries(Object.entries(fields).map(([key, field]) => [
            key,
            key === "fromHost" ? field.value.trim() : field.value.split(/[,\n]/).map(value => value.trim()).filter(Boolean)
        ]));
    }

    function fillConfig(config) {
        if (!config || typeof config !== "object" || Array.isArray(config)) {
            throw new Error("配置必须是 JSON 对象");
        }

        const values = Object.entries(fields).map(([key, field]) => {
            const value = config[key] ?? "";
            if (typeof value === "string") return [field, value];
            if (key !== "fromHost" && Array.isArray(value) && value.every(item => typeof item === "string")) {
                return [field, value.join(key === "corsHost" ? "\n" : ",")];
            }
            throw new Error(`${key} 格式错误`);
        });

        for (const [field, value] of values) field.value = value;
    }

    async function importConfig(load) {
        try {
            fillConfig(await load());
            status.textContent = "配置已填入，请检查后点击「应用配置」。";
        } catch (err) {
            alert(`配置导入失败：${err.message}`);
        }
    }

    fetchRemoteBtn.addEventListener("click", async () => {
        const rawUrl = remoteUrlInput.value.trim();
        if (!rawUrl) return alert("请输入远程配置地址");

        await importConfig(async () => {
            const url = globalThis.chrome?.runtime?.getURL && !/^https?:\/\//i.test(rawUrl)
                ? chrome.runtime.getURL(rawUrl)
                : rawUrl;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        });
    });

    const configMenu = document.getElementById("configMenu");
    document.getElementById("importFile").addEventListener("click", () => {
        configMenu.open = false;
        fileInput.click();
    });
    fileInput.addEventListener("change", async () => {
        const [file] = fileInput.files;
        fileInput.value = "";
        if (file) await importConfig(async () => JSON.parse(await file.text()));
    });

    document.getElementById("exportFile").addEventListener("click", () => {
        configMenu.open = false;
        const content = JSON.stringify(readConfig(), null, 4) + "\n";
        const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "itoken-config.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    async function restoreConfig() {
        try {
            const config = extensionStorage
                ? (await extensionStorage.get("config")).config
                : JSON.parse(localStorage.getItem(previewKey));
            if (config) fillConfig(config);
        } catch (err) {
            status.textContent = `读取配置失败：${err.message}`;
        }
    }

    restoreConfig();

    saveBtn.addEventListener("click", async () => {
        try {
            const config = readConfig();
            if (extensionStorage) {
                await extensionStorage.set({ config });
                chrome.runtime.sendMessage({ type: "updateCorsRules" });
                status.textContent = "配置已保存，下次同步时生效。";
            } else {
                localStorage.setItem(previewKey, JSON.stringify(config));
                status.textContent = "已保存到预览页，可刷新验证。";
            }
        } catch (err) {
            status.textContent = `保存失败：${err.message}`;
        }
    });
});
