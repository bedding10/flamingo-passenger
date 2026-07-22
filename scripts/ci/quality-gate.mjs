import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const failures = [];
const passes = [];
const pass = (label) => passes.push(label);
const fail = (label, detail) => failures.push({ label, detail });
const json = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const files = [];
const walk = (directory) => {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory)) {
    if (["node_modules", "dist", ".expo", "android", "ios", "ci-logs", "artifacts"].includes(entry)) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path); else files.push(path);
  }
};
walk(join(root, "src"));
walk(join(root, "assets"));
const productionSources = files.filter((path) => /\.(?:ts|tsx|js|mjs)$/.test(path) && !/\.(?:spec|test)\./.test(path));
const sourceText = productionSources.map((path) => `${relative(root, path)}\n${readFileSync(path, "utf8")}`).join("\n");
const unfinished = sourceText.match(/\b(?:TODO|FIXME)\b|FIREBASE_EMAIL_PROVIDER_CONFIGURATION_REQUIRED/gi) ?? [];
unfinished.length ? fail("no unfinished markers", unfinished.slice(0, 10)) : pass("no unfinished markers");
const debug = sourceText.match(/console\.(?:log|debug)\s*\(/g) ?? [];
debug.length ? fail("no debug logging", debug.slice(0, 10)) : pass("no debug logging");
const forbiddenRuntimeData = sourceText.match(/\b(?:mockData|stubData|placeholderData|fakeData|sampleData)\b|example\.com|gateway_stub|manual_gateway/gi) ?? [];
forbiddenRuntimeData.length ? fail("no mock, stub, or placeholder runtime data", forbiddenRuntimeData.slice(0, 10)) : pass("no mock, stub, or placeholder runtime data");
const secretPatterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\bsk_live_[0-9A-Za-z_-]{16,}\b/, /\bghp_[0-9A-Za-z]{30,}\b/, /\bglpat-[0-9A-Za-z_-]{20,}\b/];
const exposedSecret = secretPatterns.find((pattern) => pattern.test(sourceText));
exposedSecret ? fail("no embedded private secrets", exposedSecret.source) : pass("no embedded private secrets");
const appText = readFileSync(join(root, "app.json"), "utf8");
/AIza[0-9A-Za-z_-]{20,}/.test(appText) ? fail("no hardcoded Google Maps keys", "app.json") : pass("no hardcoded Google Maps keys");
const pkg = json("package.json");
if (!pkg.private || pkg.packageManager !== "npm@10.8.2" || pkg.engines?.node !== ">=20.15 <21" || pkg.engines?.npm !== ">=10 <11") fail("reproducible package metadata", "private/packageManager/engines mismatch"); else pass("reproducible package metadata");
const requiredScripts = ["doctor", "typecheck", "lint", "prebuild:ci", "build:js", "release:validate", "config:validate"];
const missingScripts = requiredScripts.filter((name) => !pkg.scripts?.[name]);
missingScripts.length ? fail("required package scripts", missingScripts) : pass("required package scripts");
if (!existsSync(join(root, "package-lock.json"))) fail("deterministic lockfile", "package-lock.json missing"); else {
  const lock = json("package-lock.json"); const locked = lock.packages?.[""] ?? {};
  const sort = (value) => Object.entries(value ?? {}).sort(([a],[b]) => a.localeCompare(b));
  const same = JSON.stringify(sort(locked.dependencies)) === JSON.stringify(sort(pkg.dependencies)) && JSON.stringify(sort(locked.devDependencies)) === JSON.stringify(sort(pkg.devDependencies));
  same ? pass("lockfile matches package") : fail("lockfile matches package", "root dependency sets differ");
}
const expected = { expo: "~52.0.47", react: "18.3.1", "react-native": "0.76.9", "expo-three": "8.0.0", three: "0.166.1", "@react-native-firebase/app": "21.12.3" };
const incompatible = Object.entries(expected).filter(([name, version]) => pkg.dependencies?.[name] !== version);
incompatible.length ? fail("pinned Expo dependency matrix", incompatible) : pass("pinned Expo dependency matrix");
const plugins = json("app.json").expo.plugins ?? [];
const pluginNames = plugins.map((value) => Array.isArray(value) ? value[0] : value);
const forbiddenPlugins = ["@react-native-firebase/auth", "@react-native-firebase/messaging", "@react-native-firebase/perf"].filter((name) => pluginNames.includes(name));
forbiddenPlugins.length ? fail("valid Firebase Expo plugins", forbiddenPlugins) : pass("valid Firebase Expo plugins");
const bundledVehicles = files.filter((path) => path.includes(`${join(root, "assets")}`) && /vehicle-.*\.(?:png|jpe?g|webp)$/i.test(path));
bundledVehicles.length ? fail("no bundled vehicle images", bundledVehicles.map((path) => relative(root, path))) : pass("no bundled vehicle images");
for (const file of ["google-services.json", "GoogleService-Info.plist", "eas.json", "app.config.js", "metro.config.js"]) existsSync(join(root, file)) ? pass(`${file} exists`) : fail(`${file} exists`, "missing");
console.log(JSON.stringify({ passed: passes, failed: failures }, null, 2));
if (failures.length) process.exit(1);
