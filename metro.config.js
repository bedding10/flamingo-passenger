const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable package.json "exports" map resolution (modern dependency layout).
config.resolver.unstable_enablePackageExports = true;

// ---------------------------------------------------------------------------
// CRITICAL: do NOT add "browser" to the GLOBAL condition set.
//
// With package exports enabled, a global "browser" condition forces EVERY
// dependency that ships a web build to resolve to it on the device (e.g.
// react-native-reanimated, react-native-safe-area-context, react-native-maps,
// @shopify/flash-list). Those web builds do not crash, they simply do nothing
// native: layout animations never run, so "entering" views stay at opacity 0
// and maps/lists silently fail to draw - an invisible, frozen-looking UI with
// no red screen.
//
// axios is the ONLY dependency here that genuinely needs its "browser" build in
// React Native (its default build imports Node core modules like "url"/"http").
// So the condition is scoped to axios alone via resolveRequest.
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
