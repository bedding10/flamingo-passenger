import React, { useEffect, useMemo } from "react";
import { StatusBar } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSession } from "../core/session-store";
import { useTheme } from "../core/theme-store";
import { BootScreen } from "../components/BootScreen";
import { AuthScreen } from "../features/auth/AuthScreen";
import { ProfileScreen } from "../features/profile/ProfileScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { lazyScreen } from "./lazy";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";

// The redesigned drawer replaced the old full-screen menu. The route itself is
// kept so the navigation structure and deep links stay identical; it simply
// returns to the map, where the drawer lives.
function MenuScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Menu">) {
  useEffect(() => {
    navigation.replace("Home");
  }, [navigation]);
  return null;
}

// Secondary screens are code-split: the first bundle evaluation only pays for
// auth, the map, the menu and the profile. Each module is required the first
// time the user actually opens one of its screens.
const trips = () => import("../features/services/TripsPlacesScreens");
const finance = () => import("../features/services/FinanceScreens");
const account = () => import("../features/services/AccountSupportScreens");
const TripsScreen = lazyScreen(() =>
  import("../features/menu/TripsScreen").then((m) => m.TripsScreen),
);
const TripDetailsScreen = lazyScreen(() => trips().then((m) => m.TripDetailsScreen));
const PlacesScreen = lazyScreen(() => trips().then((m) => m.PlacesScreen));
const PlaceEditorScreen = lazyScreen(() => trips().then((m) => m.PlaceEditorScreen));
const TripCompletionScreen = lazyScreen(() =>
  import("../features/services/TripCompletionScreen").then((m) => m.TripCompletionScreen),
);
const TripPaymentScreen = lazyScreen(() =>
  import("../features/services/TripPaymentScreen").then((m) => m.TripPaymentScreen),
);
const TripCommunicationScreen = lazyScreen(() =>
  import("../features/services/TripCommunicationScreen").then((m) => m.TripCommunicationScreen),
);
const WalletScreen = lazyScreen(() =>
  import("../features/menu/WalletScreen").then((m) => m.WalletScreen),
);
const CouponsScreen = lazyScreen(() =>
  import("../features/menu/CouponsScreen").then((m) => m.CouponsScreen),
);
const ReferralsScreen = lazyScreen(() => finance().then((m) => m.ReferralsScreen));
const SubscriptionsScreen = lazyScreen(() => finance().then((m) => m.SubscriptionsScreen));
const NotificationsScreen = lazyScreen(() =>
  import("../features/services/NotificationsScreen").then((m) => m.NotificationsScreen),
);
import { AccountScreen } from "../features/menu/AccountScreen";
const SupportScreen = lazyScreen(() =>
  import("../features/menu/HelpScreen").then((m) => m.HelpScreen),
);
const SupportTicketScreen = lazyScreen(() => account().then((m) => m.SupportTicketScreen));
const LegalScreen = lazyScreen(() => account().then((m) => m.LegalScreen));
const LegalDocumentScreen = lazyScreen(() => account().then((m) => m.LegalDocumentScreen));
const AboutScreen = lazyScreen(() => account().then((m) => m.AboutScreen));
const ContactScreen = lazyScreen(() => account().then((m) => m.ContactScreen));
const SettingsScreen = lazyScreen(() => account().then((m) => m.SettingsScreen));
const DeleteAccountScreen = lazyScreen(() => account().then((m) => m.DeleteAccountScreen));
const Stack = createNativeStackNavigator<RootStackParamList>();
export function RootNavigator() {
  const { ready, session, profile } = useSession();
  const { palette, name } = useTheme();
  // React Navigation theme is derived from the single palette source so the
  // navigator background never flashes the wrong colour when switching themes.
  const navigationTheme: Theme = useMemo(() => {
    const base = name === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: name === "dark",
      colors: {
        ...base.colors,
        primary: palette.primary,
        background: palette.bg,
        card: palette.surface,
        text: palette.text,
        border: palette.border,
        notification: palette.accent,
      },
    };
  }, [name, palette]);
  return (
    <>
      <StatusBar
        barStyle={name === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.bg}
      />
      {!ready ? (
        <BootScreen />
      ) : (
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              animationDuration: 240,
              freezeOnBlur: true,
              contentStyle: { backgroundColor: palette.bg },
            }}
          >
            {!session ? (
              <Stack.Screen name="Auth" component={AuthScreen} />
            ) : !profile?.profileComplete ? (
              <Stack.Screen name="CompleteProfile" component={ProfileScreen} />
            ) : (
              <>
                <Stack.Screen name="Home" component={HomeScreen} options={{ animation: "fade" }} />
                <Stack.Screen name="Menu" component={MenuScreen} options={{ animation: "slide_from_left" }} />
                <Stack.Screen name="Profile" component={AccountScreen} />
                <Stack.Screen name="Trips" component={TripsScreen} />
                <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
                <Stack.Screen name="TripCompletion" component={TripCompletionScreen} />
                <Stack.Screen name="TripPayment" component={TripPaymentScreen} />
                <Stack.Screen name="TripCommunication" component={TripCommunicationScreen} />
                <Stack.Screen name="Places" component={PlacesScreen} />
                <Stack.Screen name="PlaceEditor" component={PlaceEditorScreen} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen name="Coupons" component={CouponsScreen} />
                <Stack.Screen name="Referrals" component={ReferralsScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
                <Stack.Screen name="Support" component={SupportScreen} />
                <Stack.Screen name="SupportTicket" component={SupportTicketScreen} />
                <Stack.Screen name="Legal" component={LegalScreen} />
                <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
                <Stack.Screen name="About" component={AboutScreen} />
                <Stack.Screen name="Contact" component={ContactScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </>
  );
}
