import "react-native-gesture-handler";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import App from "./src/App";

// The layout direction is NEVER forced here.
//
// flaminGO used to call `I18nManager.forceRTL(true)` at boot and hard-restart
// the process so the native tree picked it up. That approach kept biting us:
// Yoga then mirrored `row-reverse` a second time, physical `left`/`right`
// silently swapped, and the restart itself was unreliable in dev.
//
// The layout is now written out explicitly in the stylesheets (menu on the
// right, hamburger on the right, and so on) and never depends on a system
// flag. Only TEXT alignment follows the chosen language, at render time, via
// `useTextDirection()`. Nothing to do at boot, and no restart when the user
// switches language.

// Modular API (v22). Registers a no-op background handler so data-only FCM
// messages don't crash the headless JS task when the app is backgrounded.
setBackgroundMessageHandler(getMessaging(), async () => undefined);

registerRootComponent(App);
