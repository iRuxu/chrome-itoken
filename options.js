document.addEventListener("DOMContentLoaded", () => {


    // 订阅区
    // ================
    const remoteUrlInput = document.getElementById("rssUrl");
    const fetchRemoteBtn = document.getElementById("rssBtn");

    fetchRemoteBtn.addEventListener("click", () => {
        const rawUrl = remoteUrlInput.value.trim();
        if (!rawUrl) {
            alert("请输入远程配置地址");
            return;
        }

        // 如果是相对路径（如 demo.json），自动转为插件资源路径
        const url = rawUrl.startsWith("http")
            ? rawUrl
            : chrome.runtime.getURL(rawUrl); // 转成 chrome-extension://....../demo.json

        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error("无法获取远程配置：" + res.statusText);
                return res.json();
            })
            .then((data) => {
                // 写入表单
                document.getElementById("fromHost").value = data.fromHost || "";
                document.getElementById("toHost").value = (data.toHost || []).join(",");
                document.getElementById("localStorageKeys").value = (data.localStorageKeys || []).join(",");
                document.getElementById("cookieKeys").value = (data.cookieKeys || []).join(",");
            })
            .catch((err) => {
                console.error("配置加载失败", err);
                alert("配置加载失败，请检查地址或格式");
            });
    });

    // 表单区
    // ================
    const fromHostInput = document.getElementById("fromHost");
    const toHostInput = document.getElementById("toHost");
    const lsKeysInput = document.getElementById("localStorageKeys");
    const cookieKeysInput = document.getElementById("cookieKeys");
    const saveBtn = document.getElementById("saveBtn");
    const status = document.getElementById("status");

    // 自动恢复配置
    chrome.storage.local.get("config", (res) => {
        const config = res.config || {};
        fromHostInput.value = config.fromHost || "";
        toHostInput.value = (config.toHost || []).join(",");
        lsKeysInput.value = (config.localStorageKeys || []).join(",");
        cookieKeysInput.value = (config.cookieKeys || []).join(",");
    });

    // 保存配置
    saveBtn.addEventListener("click", () => {
        const config = {
            fromHost: fromHostInput.value.trim(),
            toHost: toHostInput.value
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v),
            localStorageKeys: lsKeysInput.value
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v),
            cookieKeys: cookieKeysInput.value
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v),
        };

        chrome.storage.local.set({ config }, () => {
            status.textContent = "配置已保存 ✅";
            setTimeout(() => {
                status.textContent = "";
            }, 2000);
        });
    });

    // 清空配置
    const clearBtn = document.getElementById("clearBtn");
    clearBtn.addEventListener("click", () => {
        document.getElementById("fromHost").value = "";
        document.getElementById("toHost").value = "";
        document.getElementById("localStorageKeys").value = "";
        document.getElementById("cookieKeys").value = "";
    });



});
