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

    const useTeamPreset = document.getElementById("useTeamPreset");
    const teamPresetRow = document.getElementById("teamPresetRow");
    const remoteImportRow = document.getElementById("remoteImportRow");
    const presetSelect = document.getElementById("teamPreset");
    const applyPreset = document.getElementById("applyPreset");
    const importHint = document.getElementById("import-hint");
    const remoteHint = importHint.textContent;
    let presets = [];

    function updateImportMode() {
        teamPresetRow.hidden = !useTeamPreset.checked;
        remoteImportRow.hidden = useTeamPreset.checked;
        importHint.textContent = useTeamPreset.checked
            ? "选择团队方案并加载，检查后点击下方的「保存配置」。"
            : remoteHint;
    }

    useTeamPreset.addEventListener("change", updateImportMode);
    updateImportMode();

    fetch("preset/index.json").then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }).then(data => {
        if (!Array.isArray(data) || !data.length || !data.every(item => typeof item?.name === "string" && item.config)) {
            throw new Error("预设清单为空或格式不正确");
        }
        presets = data;
        presetSelect.replaceChildren(
            new Option("请选择团队方案", ""),
            ...presets.map((preset, index) => new Option(preset.name, index))
        );
        presetSelect.disabled = false;
    }).catch(() => {
        presetSelect.options[0].textContent = "暂无可用的团队预设";
    });

    presetSelect.addEventListener("change", () => {
        applyPreset.disabled = presetSelect.value === "";
    });
    applyPreset.addEventListener("click", () => {
        const preset = presets[presetSelect.value];
        if (preset) return importConfig(() => preset.config);
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
