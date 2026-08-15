/**
 * محفظتي — Wallet page (drawer item 2).
 *
 * Reads the balance from the EXISTING endpoint `passengerServicesApi.wallet`
 * (GET /wallet/me). Nothing is transferred, credited or debited here.
 *
 * • شحن المحفظة → shows a QR code that encodes the user's own wallet id, so an
 *   agent can scan it. Pure display, no request.
 * • إرسال رصيد  → opens the camera to scan someone else's wallet QR and shows
 *   the scanned payload. The transfer itself is intentionally NOT implemented:
 *   there is no transfer endpoint in the current backend, and the brief says
 *   UI only.
 */
import React, { useCallback, useState } from "react"
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { passengerServicesApi } from "../../core/passenger-api"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"
import { useSession } from "../../core/session-store"
import { useTheme } from "../../core/theme-store"
import type { RootStackParamList } from "../../navigation/types"
import {
  Card,
  GhostAction,
  InfoRow,
  MenuScaffold,
  PrimaryAction,
  SectionLabel,
  StatusMessage,
} from "../../components/menu/MenuScaffold"
import { CloseIcon, QrIcon, SendIcon } from "../../components/icons/Icons"
import {
  colors,
  iconSize,
  radius,
  spacing,
  typography,
} from "../../design/theme"
import { WalletQr } from "./WalletQr"
import { WalletScanner } from "./WalletScanner"

const ILLUSTRATION = require("../../../assets/illus-wallet.webp")

type Props = NativeStackScreenProps<RootStackParamList, "Wallet">

export function WalletScreen({ navigation }: Props) {
  const { locale, messages } = useMessages()
  const { palette } = useTheme()
  const profile = useSession((state) => state.profile)
  const [mode, setMode] = useState<"none" | "receive" | "send">("none")
  const [scanned, setScanned] = useState<string | null>(null)

  const wallet = useQuery({
    queryKey: ["wallet", 1],
    queryFn: () => passengerServicesApi.wallet(1),
    staleTime: 30_000,
  })

  const close = useCallback(() => setMode("none"), [])

  // إرسال رصيد: a single tap must land on the camera. We clear the previous
  // scan first so the sheet never re-opens on a stale result.
  const openScanner = useCallback(() => {
    setScanned(null)
    setMode("send")
  }, [])

  const balance = wallet.data?.balance ?? 0
  const currency = wallet.data?.currency ?? "DZD"

  return (
    <MenuScaffold
      title={tr(messages, "wallet.title")}
      subtitle={tr(messages, "wallet.subtitle")}
      onBack={() => navigation.goBack()}
      loading={wallet.isLoading}
    >
      {/* Illustration, then the balance in the open — no card around it. */}
      <Image
        source={ILLUSTRATION}
        style={styles.hero}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />

      <View style={styles.balanceBlock}>
        <Text style={styles.balance}>
          {Number(balance).toLocaleString(locale)}{" "}
          <Text style={styles.currency}>{currency}</Text>
        </Text>
        <Text style={[styles.balanceLabel, { color: palette.textMuted }]}>
          {tr(messages, "wallet.current")}
        </Text>
        {wallet.data?.lockedBalance ? (
          <Text style={[styles.locked, { color: palette.textMuted }]}>
            {`${tr(messages, "wallet.temporaryLocked")}: ${wallet.data.lockedBalance} ${currency}`}
          </Text>
        ) : null}
      </View>

      {/* The two actions sit side by side, as asked. */}
      <View style={styles.actions}>
        <View style={styles.action}>
          <PrimaryAction
            label={tr(messages, "wallet.topUp")}
            onPress={() => setMode("receive")}
            leading={<QrIcon size={iconSize.md} color={colors.black} />}
          />
        </View>
        <View style={styles.action}>
          <GhostAction
            label={tr(messages, "wallet.sendBalance")}
            onPress={openScanner}
            leading={<SendIcon size={iconSize.md} />}
          />
        </View>
      </View>

      {scanned ? (
        <StatusMessage>{`${tr(messages, "wallet.scanned")} ${scanned}`}</StatusMessage>
      ) : null}

      {wallet.data?.transactions?.length ? (
        <>
          <SectionLabel>{tr(messages, "wallet.recent")}</SectionLabel>
          <Card>
            {wallet.data.transactions.slice(0, 8).map((item) => (
              <InfoRow
                key={item.id}
                title={item.transaction?.reason ?? item.transaction?.command ?? tr(messages, "common.operation")}
                subtitle={new Date(item.createdAt).toLocaleString(locale)}
                // Ledger amounts are always positive, so the sign is the only
                // thing separating a top-up from a ride payment here.
                value={`${item.direction === "DEBIT" ? "−" : "+"}${item.amount} ${currency}`}
              />
            ))}
          </Card>
        </>
      ) : null}

      {/* ── QR sheets ───────────────────────────────────────────── */}
      <Modal
        visible={mode !== "none"}
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={[styles.modal, { backgroundColor: palette.bg }]}>
          <Pressable
            onPress={close}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel={tr(messages, "common.close")}
            style={styles.modalClose}
          >
            <CloseIcon size={iconSize.lg} color={colors.gold} />
          </Pressable>

          {mode === "receive" ? (
            <WalletQr
              value={`flamingo:wallet:${profile?.id ?? ""}`}
              name={profile?.name ?? ""}
            />
          ) : (
            <WalletScanner
              onScanned={(value) => {
                setScanned(value)
                close()
              }}
            />
          )}
        </View>
      </Modal>
    </MenuScaffold>
  )
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    height: 150,
    alignSelf: "center",
  },
  balanceBlock: {
    alignItems: "center",
    gap: spacing.xs,
  },
  locked: {
    ...typography.caption,
  },
  actions: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  action: { flex: 1 },
  balanceLabel: {
    ...typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balance: {
    ...typography.display,
    fontSize: 42,
    textAlign: "center",
    color: colors.gold,
  },
  currency: {
    ...typography.subtitle,
    color: colors.gold,
  },
  modal: {
    flex: 1,
    paddingTop: spacing["4xl"],
  },
  modalClose: {
    alignSelf: "flex-end",
    padding: spacing.lg,
    borderRadius: radius.sm,
  },
})

export default WalletScreen
