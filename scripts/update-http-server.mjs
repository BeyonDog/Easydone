/**
 * Static HTTP server for LAN update artifacts in Update/.
 * Listens on 0.0.0.0 so colleagues can download latest.json and the installer.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const updateDir = path.join(root, "Update");
const PORT = Number(process.env.UPDATE_HTTP_PORT || 8080);
const HOST = process.env.UPDATE_HTTP_HOST || "0.0.0.0";

const mime = {
  ".json": "application/json; charset=utf-8",
  ".exe": "application/octet-stream",
  ".sig": "text/plain; charset=utf-8",
};

if (!fs.existsSync(updateDir)) {
  fs.mkdirSync(updateDir, { recursive: true });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url || "/", `http://${HOST}`).pathname);
  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const rel = safe === "/" || safe === "\\" ? "index.html" : safe.replace(/^[/\\]/, "");
  const filePath = path.join(updateDir, rel);

  if (!filePath.startsWith(updateDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (urlPath === "/" || urlPath === "") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      const files = fs.existsSync(updateDir) ? fs.readdirSync(updateDir) : [];
      const list = files.length
        ? files.map((f) => `<li><a href="/${encodeURIComponent(f)}">${f}</a></li>`).join("")
        : "<li>（目录为空，发版后会出现 latest.json 与安装包）</li>";
      return res.end(
        `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>easydone Update</title></head><body><h1>easydone 内网更新目录</h1><ul>${list}</ul></body></html>`,
      );
    }
    res.writeHead(404);
    return res.end("Not found");
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[update-http] serving ${updateDir}`);
  console.log(`[update-http] http://127.0.0.1:${PORT}/`);
  console.log(`[update-http] http://10.21.125.168:${PORT}/ (LAN — use your IP if this machine's address changes)`);
  console.log("[update-http] Press Ctrl+C to stop.");
});
