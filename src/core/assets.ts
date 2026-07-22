import * as FS from "expo-file-system";
import { api } from "./api";
import { cache } from "./storage";
export type ManagedAsset = {
  key: string;
  kind: string;
  contentType: string;
  version: number;
  etag: string;
  bytes?: number;
  url: string;
};
type Manifest = { etag: string; assets: ManagedAsset[] };
const ROOT = `${FS.documentDirectory}managed-assets/`,
  META = "assets.manifest";
const safe = (value: string) => value.replace(/[^a-z0-9._-]/gi, "_");
const extension = (type: string) =>
  (
    ({
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/svg+xml": "svg",
      "application/json": "json",
      "model/gltf-binary": "glb",
    }) as Record<string, string>
  )[type] ?? "bin";
export const localAssetUri = (key: string, type: string) =>
  `${ROOT}${safe(key)}.${extension(type)}`;
let activeSync: Promise<Manifest> | null = null;
async function runSync() {
  await FS.makeDirectoryAsync(ROOT, { intermediates: true });
  const raw = cache.getString(META);
  const old = raw ? (JSON.parse(raw) as Manifest) : undefined;
  const { data } = await api.get<Manifest>(
    "/managed-assets/manifest/passenger",
  );
  const previous = new Map(old?.assets.map((asset) => [asset.key, asset]));
  for (const asset of data.assets) {
    const before = previous.get(asset.key),
      path = localAssetUri(asset.key, asset.contentType),
      info = await FS.getInfoAsync(path);
    if (
      info.exists &&
      before?.version === asset.version &&
      before.etag === asset.etag
    )
      continue;
    const temp = `${path}.download`;
    await FS.deleteAsync(temp, { idempotent: true });
    await FS.downloadAsync(asset.url, temp);
    const downloaded = await FS.getInfoAsync(temp);
    if (
      !downloaded.exists ||
      (asset.bytes && downloaded.size !== asset.bytes)
    ) {
      await FS.deleteAsync(temp, { idempotent: true });
      throw Error(`ASSET_INTEGRITY_FAILED:${asset.key}`);
    }
    await FS.deleteAsync(path, { idempotent: true });
    await FS.moveAsync({ from: temp, to: path });
    if (before && before.contentType !== asset.contentType)
      await FS.deleteAsync(localAssetUri(before.key, before.contentType), {
        idempotent: true,
      });
  }
  const live = new Set(data.assets.map((asset) => asset.key));
  for (const asset of old?.assets ?? [])
    if (!live.has(asset.key))
      await FS.deleteAsync(localAssetUri(asset.key, asset.contentType), {
        idempotent: true,
      });
  cache.set(META, JSON.stringify(data));
  return data;
}
export function syncManagedAssets() {
  activeSync ??= runSync().finally(() => {
    activeSync = null;
  });
  return activeSync;
}
export function managedAsset(key: string) {
  const raw = cache.getString(META);
  if (!raw) return null;
  try {
    const asset = (JSON.parse(raw) as Manifest).assets.find(
      (item) => item.key === key,
    );
    return asset
      ? { ...asset, localUri: localAssetUri(asset.key, asset.contentType) }
      : null;
  } catch {
    cache.delete(META);
    return null;
  }
}
