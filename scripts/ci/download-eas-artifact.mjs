import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";

const [logPath, outputPath] = process.argv.slice(2);
if (!logPath || !outputPath) throw new Error("Usage: download-eas-artifact <log> <output>");
const payload = JSON.parse(await readFile(logPath, "utf8"));
const build = Array.isArray(payload) ? payload[0] : payload;
if (!build || build.status !== "FINISHED") {
  throw new Error(`EAS build did not finish successfully (status: ${build?.status ?? "unknown"})`);
}
const url = build.artifacts?.buildUrl ?? build.artifacts?.applicationArchiveUrl;
if (!url) throw new Error("EAS build did not return an artifact URL");
const response = await fetch(url);
if (!response.ok) throw new Error(`Artifact download failed: HTTP ${response.status}`);
const data = Buffer.from(await response.arrayBuffer());
if (data.length < 1024 || data[0] !== 0x50 || data[1] !== 0x4b) {
  throw new Error(`Downloaded ${extname(outputPath)} artifact is not a valid Android ZIP container`);
}
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, data);
console.log(`Downloaded ${outputPath} (${data.length} bytes)`);
