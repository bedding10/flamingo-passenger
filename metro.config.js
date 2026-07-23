const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable package.json "exports" map resolution. Needed so
//   import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// resolves via three's exports map ("./examples/jsm/*": "./examples/jsm/*").
// three's own entry point ("." -> import/require) is unaffected by anything
// below: it has no "browser"/"default" keys, so it always resolves through
// the "require" condition Metro adds automatically.
config.resolver.unstable_enablePackageExports = true;

// With package exports enabled, some libraries (axios among them) expose
// separate "browser" vs Node ("default") builds in their exports map, e.g.:
//   "exports": { ".": { "browser": {...}, "default": "./dist/node/axios.cjs" } }
// Metro only picks the "browser" build if "browser" is in the accepted
// condition set -- otherwise it falls through to "default", which is the
// Node build and pulls in Node core modules ("url", "http", ...) that don't
// exist in React Native, breaking the bundle with errors like:
//   Unable to resolve module "url" from axios/dist/node/axios.cjs
//
// This does NOT require any Node polyfills and does NOT touch three's
// resolution above -- three's exports map has no "browser"/"default" keys
// to be affected by this.
config.resolver.unstable_conditionNames = Array.from(
  new Set([...(config.resolver.unstable_conditionNames ?? []), "browser"]),
);

module.exports = config;
