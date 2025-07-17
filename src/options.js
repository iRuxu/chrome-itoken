document.addEventListener("DOMContentLoaded", () => {
    // =============== 远程配置加载 ===============
    const remoteUrlInput = document.getElementById("rssUrl");
    const fetchRemoteBtn = document.getElementById("rssBtn");

    fetchRemoteBtn.addEventListener("click", () => {
        const rawUrl = remoteUrlInput.value.trim();
        if (!rawUrl) {
            alert("请输入远程配置地址");
            return;
        }

        const url = rawUrl.startsWith("http")
            ? rawUrl
            : chrome.runtime.getURL(rawUrl); // 兼容本地插件内 JSON 文件

        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error("无法获取远程配置：" + res.statusText);
                return res.json();
            })
            .then((data) => {
                if (!data || typeof data !== "object") {
                    throw new Error("远程配置格式错误");
                }
                document.getElementById("fromHost").value = data.fromHost || "";
                document.getElementById("toHost").value = data.toHost || "";
                document.getElementById("localStorageKeys").value = data.localStorageKeys || "";
                document.getElementById("cookieKeys").value = data.cookieKeys || "";
                document.getElementById("corsHost").value = data.corsHost || "";
            })
            .catch((err) => {
                console.error("配置加载失败", err);
                alert("配置加载失败，请检查地址或格式");
            });
    });

    // =============== 表单项 ===============
    const fromHostInput = document.getElementById("fromHost");
    const toHostInput = document.getElementById("toHost");
    const lsKeysInput = document.getElementById("localStorageKeys");
    const cookieKeysInput = document.getElementById("cookieKeys");
    const corsHostTextarea = document.getElementById("corsHost");
    const saveBtn = document.getElementById("saveBtn");
    const status = document.getElementById("status");

    // =============== 自动恢复配置 ===============
    chrome.storage.local.get("config", (res) => {
        const config = res.config || {};
        fromHostInput.value = config.fromHost || "";
        toHostInput.value = (config.toHost || []).join(",");
        lsKeysInput.value = (config.localStorageKeys || []).join(",");
        cookieKeysInput.value = (config.cookieKeys || []).join(",");
        corsHostTextarea.value = (config.corsHost || []).join("\n");
    });

    // =============== 保存配置 ===============
    saveBtn.addEventListener("click", () => {
        const config = {
            fromHost: fromHostInput.value.trim(),
            toHost: toHostInput.value
                .split(/,|\n/)
                .map((v) => v.trim())
                .filter((v) => v),
            localStorageKeys: lsKeysInput.value
                .split(/,|\n/)
                .map((v) => v.trim())
                .filter((v) => v),
            cookieKeys: cookieKeysInput.value
                .split(/,|\n/)
                .map((v) => v.trim())
                .filter((v) => v),
            corsHost: corsHostTextarea.value
                .split(/,|\n/)
                .map(line => line.trim())
                .filter(Boolean)
        };

        chrome.storage.local.set({ config }, () => {
            chrome.runtime.sendMessage({ type: "updateCorsRules" });
            status.textContent = "配置已保存 ✅";
            setTimeout(() => {
                status.textContent = "";
            }, 2000);
        });
    });

    // =============== 清空配置 ===============
    const clearBtn = document.getElementById("clearBtn");
    clearBtn.addEventListener("click", () => {
        fromHostInput.value = "";
        toHostInput.value = "";
        lsKeysInput.value = "";
        cookieKeysInput.value = "";
        corsHostTextarea.value = "";
    });
});