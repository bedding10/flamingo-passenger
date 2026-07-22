const tokenAvailable = Boolean(process.env.EXPO_TOKEN?.trim() || process.env.EAS_TOKEN?.trim());
const groups = {
  passenger: ["EXPO_PUBLIC_API_URL"],
  "native-config": [
    "EAS_PROJECT_ID",
    "EXPO_PUBLIC_API_URL",
    "GOOGLE_MAPS_ANDROID_API_KEY",
    "GOOGLE_MAPS_IOS_API_KEY",
  ],
  "android-build": [
    "EAS_PROJECT_ID",
    "EXPO_PUBLIC_API_URL",
    "GOOGLE_MAPS_ANDROID_API_KEY",
    "GOOGLE_MAPS_IOS_API_KEY",
  ],
};

const group = process.argv[2];
const required = groups[group];
if (!required) throw new Error(`Unknown environment group: ${group}`);
const missing = required.filter((name) => !process.env[name]?.trim());
if (group === "android-build" && !tokenAvailable) missing.push("EXPO_TOKEN or EAS_TOKEN");
if (missing.length) {
  console.error(`Missing protected CI variables for ${group}: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`Protected environment for ${group} is complete.`);
