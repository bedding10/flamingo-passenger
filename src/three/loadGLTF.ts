import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Asset } from "expo-asset";

/**
 * Anything loadGLTFAsync can turn into a local file:// URI:
 *  - a plain string URI (e.g. a file:// path already downloaded via
 *    expo-file-system, or a remote https:// URL)
 *  - a Metro module id from `require("./model.glb")`
 *  - an already-constructed expo-asset `Asset`
 */
export type GLTFSource = string | number | Asset;

async function resolveLocalUri(source: GLTFSource): Promise<string> {
  if (typeof source === "string") return source;

  const asset = source instanceof Asset ? source : Asset.fromModule(source);
  if (!asset.localUri) {
    // Copies the bundled/remote asset into the app's local file storage
    // and populates `asset.localUri` with a file:// path.
    await asset.downloadAsync();
  }
  if (!asset.localUri) {
    throw new Error("GLTF asset could not be resolved to a local file URI");
  }
  return asset.localUri;
}

/**
 * Loads a .glb/.gltf model using three.js' own GLTFLoader -- no expo-three.
 *
 * GLTFLoader drives an internal THREE.FileLoader (via the LoadingManager
 * passed in here) configured with responseType "arraybuffer", which is
 * what lets it read binary .glb data. That FileLoader uses the platform's
 * `fetch`, which in Expo/React Native reads local file:// URIs (and
 * https:// URIs) correctly on both Android and iOS -- the same mechanism
 * expo-three's `loadAsync` relied on internally, just without the extra
 * dependency.
 *
 * The `manager` is exposed on the loader for callers that ever need to
 * add auth headers or rewrite URLs for remote assets via
 * `loader.manager.setURLModifier(...)` -- not needed for local files.
 */
export async function loadGLTFAsync(source: GLTFSource): Promise<GLTF> {
  const uri = await resolveLocalUri(source);
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);

  return new Promise((resolve, reject) => {
    loader.load(
      uri,
      (gltf) => resolve(gltf),
      undefined,
      (error) =>
        reject(error instanceof Error ? error : new Error(String(error))),
    );
  });
}
