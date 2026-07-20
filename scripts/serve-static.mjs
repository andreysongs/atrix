import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, resolve, sep } from "node:path";

const root = resolve("out");
const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://localhost");
    const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    let file = resolve(root, requested || "index.html");
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const details = await stat(file).catch(() => null);
    if (details?.isDirectory()) file = resolve(file, "index.html");
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": file.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable",
    });
    response.end(body);
  } catch {
    try {
      const fallback = await readFile(resolve(root, "index.html"));
      response.writeHead(200, { "Content-Type": types[".html"], "Cache-Control": "no-cache" });
      response.end(fallback);
    } catch {
      response.writeHead(404).end("Not found");
    }
  }
}).listen(port, "0.0.0.0", () => {
  process.stdout.write("FORGE preview: http://localhost:" + port + "\n");
  const localAddress = Object.values(networkInterfaces()).flat().find((address) => address?.family === "IPv4" && !address.internal)?.address;
  if (localAddress) process.stdout.write("Rede local: http://" + localAddress + ":" + port + "\n");
});
