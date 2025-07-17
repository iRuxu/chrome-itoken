chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "getLocalStorage") {
        const result = {};
        for (const key of msg.keys) {
            result[key] = localStorage.getItem(key);
        }
        sendResponse(result);
    }
});