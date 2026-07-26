import React, { useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  LifeBuoy,
  MessageCircle,
  PhoneCall,
  ShieldAlert,
} from "lucide-react-native";
import { PressScale } from "./PressScale";
import { Illustration } from "./Illustration";
import { tr } from "../core/i18n";
import { passengerServicesApi } from "../core/passenger-api";
import { RADIUS, SHADOW, SPACING, TYPE } from "../core/design";
import { useTheme } from "../core/theme-store";
import { withAlpha, type Palette } from "../core/theme";

type FaqEntry = { id?: string; question?: string; answer?: string };

// The top of the help screen: the last ride, the three fastest ways to reach a
// human, and the FAQ list the dashboard publishes through app configuration.
function HelpHubBase({
  messages,
  onOpenTrip,
  onLiveChat,
}: {
  messages: Record<string, string>;
  onOpenTrip: (tripId: string) => void;
  onLiveChat: (tripId: string) => void;
}) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const config = useQuery({
    queryKey: ["passenger-config"],
    queryFn: passengerServicesApi.config,
  });
  const trips = useQuery({
    queryKey: ["passenger-trips-last"],
    queryFn: () => passengerServicesApi.trips(1),
  });

  const contact = config.data?.settings["passenger.contact"] as
    | { phone?: string; emergencyPhone?: string }
    | undefined;
  const faq = ((config.data?.settings["passenger.faq"] as { items?: FaqEntry[] } | undefined)
    ?.items ?? []) as FaqEntry[];
  const lastTrip = trips.data?.items?.[0] as
    | { id: string; destAddress?: string; status?: string }
    | undefined;

  return (
    <View style={styles.wrap}>
      <Illustration name="help" size={128} />

      {lastTrip ? (
        <PressScale
          accessibilityLabel={tr(messages, "help.lastTrip")}
          onPress={() => onOpenTrip(lastTrip.id)}
          style={styles.lastTrip}
        >
          <View style={styles.iconDisc}>
            <LifeBuoy size={18} color={palette.accent} strokeWidth={2.2} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>{tr(messages, "help.lastTrip")}</Text>
            <Text numberOfLines={1} style={styles.value}>
              {lastTrip.destAddress ?? tr(messages, "trips.destinationUnavailable")}
            </Text>
          </View>
        </PressScale>
      ) : null}

      <View style={styles.actions}>
        {lastTrip ? (
          <PressScale
            accessibilityLabel={tr(messages, "help.liveChat")}
            onPress={() => onLiveChat(lastTrip.id)}
            style={styles.action}
          >
            <MessageCircle size={20} color={palette.text} strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.actionText}>
              {tr(messages, "help.liveChat")}
            </Text>
          </PressScale>
        ) : null}
        {contact?.phone ? (
          <PressScale
            accessibilityLabel={tr(messages, "help.callSupport")}
            onPress={() => void Linking.openURL(`tel:${contact.phone}`)}
            style={styles.action}
          >
            <PhoneCall size={20} color={palette.text} strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.actionText}>
              {tr(messages, "help.callSupport")}
            </Text>
          </PressScale>
        ) : null}
        {contact?.emergencyPhone ? (
          <PressScale
            accessibilityLabel={tr(messages, "help.emergency")}
            onPress={() => void Linking.openURL(`tel:${contact.emergencyPhone}`)}
            style={[styles.action, styles.emergency]}
          >
            <ShieldAlert size={20} color={palette.danger} strokeWidth={2.2} />
            <Text numberOfLines={1} style={[styles.actionText, styles.emergencyText]}>
              {tr(messages, "help.emergency")}
            </Text>
          </PressScale>
        ) : null}
      </View>

      {faq.length ? (
        <View style={styles.faq}>
          <Text style={styles.section}>{tr(messages, "help.faq")}</Text>
          {faq.map((entry, index) => {
            const id = entry.id ?? String(index);
            const open = openFaq === id;
            return (
              <PressScale
                key={id}
                accessibilityLabel={entry.question ?? ""}
                onPress={() => setOpenFaq(open ? null : id)}
                style={styles.faqItem}
              >
                <View style={styles.faqHead}>
                  <Text style={styles.faqQuestion}>{entry.question ?? ""}</Text>
                  <ChevronDown size={18} color={palette.textMuted} strokeWidth={2.2} />
                </View>
                {open && entry.answer ? (
                  <Text style={styles.faqAnswer}>{entry.answer}</Text>
                ) : null}
              </PressScale>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    wrap: { gap: SPACING.md, marginBottom: SPACING.lg },
    flex: { flex: 1 },
    lastTrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      ...SHADOW.card,
    },
    iconDisc: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(palette.accent, 0.14),
    },
    label: { ...TYPE.overline, color: palette.textMuted },
    value: { ...TYPE.bodyStrong, color: palette.text },
    actions: { flexDirection: "row", gap: SPACING.sm },
    action: {
      flex: 1,
      minHeight: 78,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
    },
    actionText: { ...TYPE.caption, color: palette.text, fontWeight: "700" },
    emergency: { borderColor: withAlpha(palette.danger, 0.4) },
    emergencyText: { color: palette.danger },
    faq: { gap: SPACING.sm },
    section: { ...TYPE.overline, color: palette.textMuted },
    faqItem: {
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    faqHead: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    faqQuestion: { ...TYPE.bodyStrong, color: palette.text, flex: 1 },
    faqAnswer: { ...TYPE.caption, color: palette.textMuted, marginTop: SPACING.sm },
  });
}

export const HelpHub = React.memo(HelpHubBase);
