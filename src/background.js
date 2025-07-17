// 提取公共函数：更新 DNR 规则
async function updateCorsRules() {
    const { config } = await chrome.storage.local.get("config");
    if (!config?.corsHost?.length) return;

    const rules = config.corsHost
        .filter(url => {
            try {
                new URL(url); // 测试是否合法
                return true;
            } catch (e) {
                console.warn("[iToken] 无效URL，已跳过：", url);
                return false;
            }
        })
        .map((url, index) => {
            const urlObj = new URL(url);
            return {
                id: 1000 + index,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        { header: "origin", operation: "set", value: config.fromHost }
                    ],
                    responseHeaders: [
                        { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
                        { header: "Access-Control-Allow-Credentials", operation: "set", value: "true" }
                    ]
                },
                condition: {
                    urlFilter: `|${urlObj.origin}/`,
                    resourceTypes: ["xmlhttprequest", "fetch"]
                }
            };
        });

    console.log("[iToken]注入cors规则", rules);

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(r => r.id),
        addRules: rules
    });
}

// 插件首次安装或重载时执行
chrome.runtime.onInstalled.addListener(() => {
    updateCorsRules();
});

// 监听消息（用于配置保存后动态更新）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "updateCorsRules") {
        updateCorsRules();
    }
});