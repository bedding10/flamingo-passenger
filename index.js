import "react-native-gesture-handler";
import messaging from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import App from "./src/App";

messaging().setBackgroundMessageHandler(async () => undefined);
registerRootComponent(App);
