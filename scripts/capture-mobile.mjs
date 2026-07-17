import { writeFile } from "node:fs/promises";

const port = process.env.CDP_PORT || "9223";
const appUrl = process.env.CAPTURE_URL || "http://127.0.0.1:4173/";
const output = process.env.CAPTURE_OUTPUT || "screenshots/mobile-emulated.png";
const width = Number(process.env.CAPTURE_WIDTH || 390);
const height = Number(process.env.CAPTURE_HEIGHT || 844);
const clickSelector = process.env.CAPTURE_CLICK || "";
const clickSelectors = (process.env.CAPTURE_CLICKS || clickSelector).split(";;").filter(Boolean);
const waitMs = Number(process.env.CAPTURE_WAIT || 3000);
const clickWaitMs = Number(process.env.CAPTURE_CLICK_WAIT || 1000);
const resetStorage = process.env.CAPTURE_RESET_STORAGE === "1";

const target = await fetch("http://127.0.0.1:" + port + "/json/new?" + encodeURIComponent(appUrl), { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserEvents = [];
let sequence = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.method === "Runtime.exceptionThrown") {
    browserEvents.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || "Runtime exception");
  }
  if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") {
    browserEvents.push(message.params.entry.text);
  }
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await command("Page.enable");
await command("Network.enable");
await command("Runtime.enable");
await command("Log.enable");
await command("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 640,
  screenWidth: width,
  screenHeight: height,
});
await command("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await command("Network.setUserAgentOverride", {
  userAgent: width <= 640
    ? "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36"
    : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0 Safari/537.36",
  platform: width <= 640 ? "Android" : "Windows",
});
if (resetStorage) {
  await command("Storage.clearDataForOrigin", {
    origin: new URL(appUrl).origin,
    storageTypes: "local_storage,cache_storage,service_workers",
  });
}
await command("Page.navigate", { url: appUrl });
await new Promise((resolve) => setTimeout(resolve, waitMs));
for (const selector of clickSelectors) {
  await command("Runtime.evaluate", {
    expression: "document.querySelector(" + JSON.stringify(selector) + ")?.click()",
  });
  await new Promise((resolve) => setTimeout(resolve, clickWaitMs));
}
const { data } = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(output, Buffer.from(data, "base64"));
if (browserEvents.length) process.stderr.write(browserEvents.join("\n---\n") + "\n");
await command("Page.close");
socket.close();
process.stdout.write("Captured " + width + "x" + height + " to " + output + "\n");
