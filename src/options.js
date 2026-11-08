document.addEventListener("DOMContentLoaded", () => {
    const remoteUrlInput = document.getElementById("rssUrl");
    const fetchRemoteBtn = document.getElementById("rssBtn");
    const fileInput = document.getElementById("configFile");
    const saveBtn = document.getElementById("saveBtn");
    const status = document.getElementById("status");
    const storage = globalThis.chrome?.storage?.local;
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
            status.textContent = "配置已填入，请检查后保存。";
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

    if (storage) {
        storage.get("config").then(({ config }) => {
            if (config) fillConfig(config);
        }).catch(err => {
            status.textContent = `读取配置失败：${err.message}`;
        });
    } else {
        saveBtn.disabled = true;
        status.textContent = "请在扩展中保存配置。";
    }

    saveBtn.addEventListener("click", async () => {
        try {
            await storage.set({ config: readConfig() });
            chrome.runtime.sendMessage({ type: "updateCorsRules" });
            status.textContent = "配置已保存 ✅";
        } catch (err) {
            status.textContent = `保存失败：${err.message}`;
        }
    });
});
