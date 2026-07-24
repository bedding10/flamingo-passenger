const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable package.json "exports" map resolution. Needed so
//   import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// resolves via three's exports map ("./examples/jsm/*": "./examples/jsm/*").
config.resolver.unstable_enablePackageExports = true;

// Treat 3D model formats as bundled assets so that
//   require("../../assets/brand-logo.glb")
// resolves and the .glb is packaged into the app bundle.
config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts ?? []), "glb", "gltf", "bin"]),
);

// ---------------------------------------------------------------------------
// CRITICAL FIX (was the primary cause of the "unusable UI").
//
// The previous config added "browser" to the GLOBAL condition set:
//   config.resolver.unstable_conditionNames = [...(...), "browser"];
//
// With package exports enabled, that forces EVERY dependency whose exports map
// exposes a "browser" build to resolve to its WEB bundle on the device, e.g.
// react-native-reanimated, react-native-safe-area-context, react-native-maps,
// @shopify/flash-list, and more. Those web builds run without crashing but do
// nothing native: reanimated layout animations (FadeIn/SlideIn...) never run,
// so "entering" views stay at opacity 0 -> content and bottom sheets look
// invisible/blank; maps, lists, images and the GL surface silently fail to
// draw. That is exactly the reported symptom set (invisible UI, blank screens,
// dead 3D/images, "frozen" feel) WITH NO red screen, because nothing throws.
//
// The ONLY dependency here that genuinely needs its "browser" build in React
// Native is axios (its "default"/Node build imports Node core modules like
// "url"/"http" that don't exist in RN). So we scope the "browser" condition to
// axios ONLY, via resolveRequest, and leave every other package on its correct
// native / react-native build.
// ---------------------------------------------------------------------------
const browserConditions = Array.from(
  new Set([...(config.resolver.unstable_conditionNames ?? []), "browser"]),
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "axios" || moduleName.startsWith("axios/")) {
    // context.resolveRequest is Metro's default (upstream) resolver, so this
    // does not recurse into this custom function.
    return context.resolveRequest(
      { ...context, unstable_conditionNames: browserConditions },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
