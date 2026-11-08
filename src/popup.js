document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("openOptions").addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById("syncConf").addEventListener("click", async () => {
        try {
            const { config } = await chrome.storage.local.get("config");
            if (!config) return alert("未找到配置，请先设置");

            const { fromHost, toHost, localStorageKeys, cookieKeys } = config;
            // console.log("当前配置:", config)
            const toHosts = Array.isArray(toHost) ? toHost : toHost.split(',').map(h => h.trim());
            // console.log("目标主机列表:", toHosts);

            const tabs = await chrome.tabs.query({});
            const fromTab = tabs.find(tab => tab.url?.startsWith(fromHost));
            const toTabs = toHosts.map(host => tabs.find(tab => tab.url?.startsWith(host)));

            // 检查是否有页面未打开
            const allTabsOpen = fromTab && toTabs.every(t => t);
            if (!allTabsOpen) {
                const confirmOpen = confirm("来源页或目标页未打开，是否现在自动打开它们？");
                if (confirmOpen) {
                    if (!fromTab) chrome.tabs.create({ url: fromHost });

                    toHosts.forEach((host, i) => {
                        if (!toTabs[i]) {
                            chrome.tabs.create({ url: host });
                        }
                    });

                    alert("页面已打开，请在加载完成后再次点击“立即同步”按钮");
                    return;
                }
            }

            // 注入 content.js
            await chrome.scripting.executeScript({
                target: { tabId: fromTab.id },
                files: ["content.js"]
            });

            // 获取 localStorage
            const localStorageData = await chrome.tabs.sendMessage(fromTab.id, {
                type: "getLocalStorage",
                keys: localStorageKeys
            });
            console.log("✅ LocalStorage 获取成功:", localStorageData);

            // 获取 cookie
            const cookieData = await new Promise(resolve => {
                chrome.cookies.getAll({ url: fromTab.url }, cookies => {
                    const result = {};
                    for (const key of cookieKeys) {
                        const found = cookies.find(c => c.name === key);
                        if (found) result[key] = found.value;
                    }
                    resolve(result);
                });
            });
            console.log("🍪 Cookie 获取成功:", cookieData);

            // 写入所有目标页
            for (let i = 0; i < toTabs.length; i++) {
                const toTab = toTabs[i];
                const host = toHosts[i];

                try {
                    // 检查是否是错误页面
                    const frames = await chrome.webNavigation.getAllFrames({ tabId: toTab.id });
                    const mainFrame = frames.find(f => f.frameId === 0);

                    if (!mainFrame || mainFrame.errorOccurred) {
                        console.warn(`[跳过] tabId=${toTab.id} 页面加载失败，可能未启动或是错误页`);
                        continue;
                    }

                    // 注入 localStorage
                    await chrome.scripting.executeScript({
                        target: { tabId: toTab.id },
                        func: ({ localStorageData }) => {
                            for (const key in localStorageData) {
                                localStorage.setItem(key, localStorageData[key]);
                            }
                        },
                        args: [{ localStorageData }]
                    });

                    // 写入 cookie
                    const toURL = new URL(host);
                    for (const key in cookieData) {
                        await chrome.cookies.set({
                            url: toURL.origin,
                            name: key,
                            value: cookieData[key],
                            domain: toURL.hostname,
                            path: "/"
                        });
                    }

                    console.log(`[同步成功] tabId=${toTab.id} ${host}`);

                } catch (err) {
                    console.error(`[跳过] tabId=${toTab.id} ${host} 同步失败：`, err.message);
                    continue;
                }
            }

            alert("✅ 同步完成！");
        } catch (err) {
            console.error("❌ 同步失败:", err);
            alert("同步失败，请查看控制台错误信息！");
        }
    });
});