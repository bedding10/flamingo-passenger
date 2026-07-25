import React, { useMemo } from "react";
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
import { MenuScreen } from "../features/menu/MenuScreen";
import { TripsScreen, TripDetailsScreen, PlacesScreen, PlaceEditorScreen } from "../features/services/TripsPlacesScreens";
import { TripCompletionScreen } from "../features/services/TripCompletionScreen";
import { TripPaymentScreen } from "../features/services/TripPaymentScreen";
import { TripCommunicationScreen } from "../features/services/TripCommunicationScreen";
import { WalletScreen, CouponsScreen, ReferralsScreen, SubscriptionsScreen } from "../features/services/FinanceScreens";
import { NotificationsScreen } from "../features/services/NotificationsScreen";
import { AccountProfileScreen, SupportScreen, SupportTicketScreen, LegalScreen, LegalDocumentScreen, AboutScreen, ContactScreen, SettingsScreen, DeleteAccountScreen } from "../features/services/AccountSupportScreens";
import type { RootStackParamList } from "./types";
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
              animation: "fade",
              contentStyle: { backgroundColor: palette.bg },
            }}
          >
            {!session ? (
              <Stack.Screen name="Auth" component={AuthScreen} />
            ) : !profile?.profileComplete ? (
              <Stack.Screen name="CompleteProfile" component={ProfileScreen} />
            ) : (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Menu" component={MenuScreen} />
                <Stack.Screen name="Profile" component={AccountProfileScreen} />
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
