# flaminGO Passenger App

This repository contains the Passenger App only. All CI files and checks are self-contained at this repository root.

## Reproducible toolchain

- Node.js `20.19.6`
- npm `10.8.2`
- Expo SDK `52`
- React Native `0.76.9`
- React `18.3.1`
- Installs use the committed `package-lock.json` and `npm ci`.
- Do not use `--force` or `--legacy-peer-deps`.

## GitLab Protected/Masked variables

Configure these in **Settings → CI/CD → Variables**. Secret values must be masked and protected, and must never be committed.

| Variable | Required | Purpose |
|---|---:|---|
| `EXPO_PUBLIC_API_URL` | Yes | HTTPS API base URL used by the Passenger App. This value is embedded in the client and must not be a secret. |
| `EAS_PROJECT_ID` | Yes | Expo EAS project UUID injected into `extra.eas.projectId`. |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Yes | Android application-restricted Google Maps SDK key injected during config evaluation. |
| `GOOGLE_MAPS_IOS_API_KEY` | Yes | iOS bundle-restricted Google Maps SDK key used by full Expo prebuild/config validation. |
| `EXPO_TOKEN` | Recommended | Expo access token used by non-interactive EAS CLI. |
| `EAS_TOKEN` | Alternative | Accepted as an alternative token name; CI maps it to `EXPO_TOKEN`. Do not configure both unless they contain the same credential. |

`google-services.json` and `GoogleService-Info.plist` are the approved Firebase native configuration files. Firebase server credentials and service-account private keys must never be committed.

## Pipeline on `main`

Each push to `main` runs these stages in order:

1. Install (`npm ci` and lockfile drift check)
2. Validate (Passenger-only quality and release checks)
3. Expo Doctor
4. TypeScript
5. Lint
6. Expo Prebuild
7. Android Preview EAS build and APK download
8. Android Production EAS build and AAB download

Every job uploads `ci-logs/` even when it fails. EAS jobs also upload downloaded files under `artifacts/` for 90 days.

## Local verification

Use exactly Node 20.19.6 and npm 10.8.2:

```bash
nvm use
npm install --global npm@10.8.2
npm install
rm -rf node_modules
npm ci
npm run quality:gate
npm run release:validate
npm run config:validate
npm run expo:check
npm run doctor
npm run typecheck
npm run lint
FLAMINGO_REQUIRE_NATIVE_CONFIG=1 npm run prebuild:ci
npm run build:js
```

With the protected variables exported, run native builds:

```bash
export EXPO_TOKEN="${EXPO_TOKEN:-$EAS_TOKEN}"
FLAMINGO_REQUIRE_NATIVE_CONFIG=1 npx --no-install eas build --platform android --profile preview --non-interactive --wait
FLAMINGO_REQUIRE_NATIVE_CONFIG=1 npx --no-install eas build --platform android --profile production --non-interactive --wait
```

## Release flow

```bash
git add .
git commit -m "Update"
git push origin main
```

A successful pipeline is required before the Passenger App is considered Build Ready and CI/CD Ready.
