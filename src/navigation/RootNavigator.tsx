import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSession } from "../core/session-store";
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
  if (!ready) return <BootScreen />;
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "fade" }}
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
  );
}
