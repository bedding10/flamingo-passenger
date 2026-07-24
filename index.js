import "react-native-gesture-handler";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import App from "./src/App";

// Modular API (v22). Registers a no-op background handler so data-only FCM
// messages don't crash the headless JS task when the app is backgrounded.
setBackgroundMessageHandler(getMessaging(), async () => undefined);

registerRootComponent(App);
