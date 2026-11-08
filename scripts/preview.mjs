import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 5173;
const pages = new Map([
    ["/options.html", "text/html; charset=utf-8"],
    ["/popup.html", "text/html; charset=utf-8"]
]);
const assets = new Map([
    ["/ui.css", "text/css; charset=utf-8"],
    ["/icons/logo.png", "image/png"]
]);

createServer(async (request, response) => {
    const path = new URL(request.url, `http://${host}`).pathname;
    if (path === "/") {
        response.writeHead(302, { Location: "/options.html" }).end();
        return;
    }

    const contentType = pages.get(path) ?? assets.get(path);
    if (!contentType) {
        response.writeHead(404).end("Not found");
        return;
    }

    try {
        const source = await readFile(new URL(`../src${path}`, import.meta.url));
        const body = pages.has(path)
            ? source.toString("utf8").replace(/<script src="(?:options|popup)\.js"><\/script>/, "")
            : source;
        response.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" }).end(body);
    } catch {
        response.writeHead(500).end("Unable to load preview");
    }
}).listen(port, host, () => {
    console.log(`配置页 http://${host}:${port}/`);
    console.log(`弹窗   http://${host}:${port}/popup.html`);
});
