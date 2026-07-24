import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

/**
 * Anything loadGLTFAsync can turn into local model bytes:
 *  - a plain string URI (file:// already downloaded, or a remote https:// URL)
 *  - a Metro module id from `require("./model.glb")`
 *  - an already-constructed expo-asset `Asset`
 */
export type GLTFSource = string | number | Asset;

async function resolveLocalUri(source: GLTFSource): Promise<string> {
  if (typeof source === "string") return source;
  const asset = source instanceof Asset ? source : Asset.fromModule(source);
  if (!asset.localUri) {
    // Copies the bundled/remote asset into local file storage and populates
    // `asset.localUri` with a readable file:// path.
    await asset.downloadAsync();
  }
  if (!asset.localUri) {
    throw new Error("GLTF asset could not be resolved to a local file URI");
  }
  return asset.localUri;
}

const B64_LOOKUP = (() => {
  const table = new Uint8Array(256);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let i = 0; i < chars.length; i++) table[chars.charCodeAt(i)] = i;
  return table;
})();

// Dependency-free, binary-safe base64 -> ArrayBuffer. Needed because React
// Native's fetch/FileLoader cannot reliably read a local file:// URI as an
// arraybuffer, which is why three's GLTFLoader.load(uri) silently fails on
// device. We instead read the raw bytes with expo-file-system and hand the
// decoded ArrayBuffer straight to GLTFLoader.parse().
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const str = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  let byteLength = (str.length / 4) * 3;
  if (str.endsWith("==")) byteLength -= 2;
  else if (str.endsWith("=")) byteLength -= 1;
  const bytes = new Uint8Array(byteLength);
  let p = 0;
  for (let i = 0; i < str.length; i += 4) {
    const e1 = B64_LOOKUP[str.charCodeAt(i)];
    const e2 = B64_LOOKUP[str.charCodeAt(i + 1)];
    const e3 = B64_LOOKUP[str.charCodeAt(i + 2)];
    const e4 = B64_LOOKUP[str.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (str[i + 2] !== "=") bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (str[i + 3] !== "=") bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes.buffer;
}

/**
 * Loads a .glb/.gltf model using three.js' GLTFLoader without relying on the
 * platform fetch stack. The bytes are read via expo-file-system and parsed
 * directly, which works for self-contained .glb files on both Android and iOS.
 */
export async function loadGLTFAsync(source: GLTFSource): Promise<GLTF> {
  const uri = await resolveLocalUri(source);
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(
      arrayBuffer,
      "",
      (gltf) => resolve(gltf),
      (error) =>
        reject(error instanceof Error ? error : new Error(String(error))),
    );
  });
}
