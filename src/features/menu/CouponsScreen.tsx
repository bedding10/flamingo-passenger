/**
 * كوبوناتي — Coupons page (drawer item 4).
 *
 * One input, one button. Validation is delegated to the EXISTING endpoint
 * `passengerServicesApi.validateCoupon` (POST /coupons/validate). No local
 * rules, no caching of "activated" coupons, no new state on the server — the
 * screen only renders what the API answers.
 */
import React, { useState } from "react"
import { Image, StyleSheet, Text } from "react-native"
import { useMutation } from "@tanstack/react-query"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { passengerServicesApi } from "../../core/passenger-api"
import { useCouponStore } from "../../core/coupon-store"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"
import { useTheme } from "../../core/theme-store"
import type { RootStackParamList } from "../../navigation/types"
import {
  MenuScaffold,
  PrimaryAction,
  StatusMessage,
  UnderlineField,
} from "../../components/menu/MenuScaffold"
import { TicketIcon } from "../../components/icons/Icons"
import { colors, iconSize, spacing, typography } from "../../design/theme"

type Props = NativeStackScreenProps<RootStackParamList, "Coupons">

/**
 * The endpoint validates a code against a fare. Outside a ride there is no
 * fare yet, so we send 0 — exactly what the app already does when it checks a
 * code before a quote exists. The server skips its minimum-fare rule for 0 and
 * answers with validity only; the binding discount is computed when the ride
 * is requested.
 */
const NO_FARE = 0

const ILLUSTRATION = require("../../../assets/illus-promotions.webp")

export function CouponsScreen({ navigation }: Props) {
  const { messages } = useMessages()
  const { palette } = useTheme()
  const [code, setCode] = useState("")

  const setCoupon = useCouponStore((state) => state.setCode)

  const activate = useMutation({
    mutationFn: () =>
      passengerServicesApi.validateCoupon(code.trim().toUpperCase(), NO_FARE),
    // The server accepted the code, so hold it until a ride carries it.
    onSuccess: () => setCoupon(code),
  })

  const result = activate.data

  return (
    <MenuScaffold
      title={tr(messages, "coupons.title")}
      subtitle={tr(messages, "coupons.subtitle")}
      onBack={() => navigation.goBack()}
    >
      <Image
        source={ILLUSTRATION}
        style={styles.hero}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />

      <Text style={[styles.blurb, { color: palette.textMuted }]}>
        {tr(messages, "coupons.blurb")}
      </Text>

      <UnderlineField
        leading={<TicketIcon size={iconSize.md} color={colors.gold} />}
        value={code}
        onChangeText={(text) => {
          setCode(text)
          activate.reset()
        }}
        placeholder={tr(messages, "coupons.code")}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => code.trim() && activate.mutate()}
      />

      <PrimaryAction
        label={tr(messages, "coupons.activate")}
        onPress={() => activate.mutate()}
        disabled={code.trim().length < 3}
        loading={activate.isPending}
        leading={<TicketIcon size={iconSize.md} color={colors.black} />}
      />

      {activate.isError ? (
        <StatusMessage danger>{tr(messages, "coupons.error")}</StatusMessage>
      ) : null}

      {/* A resolved response already means the coupon is valid: the endpoint
          throws for expired, exhausted or out-of-scope codes. Reading a `valid`
          flag the server never sends made every good coupon look expired. */}
      {result ? (
        <StatusMessage>
          {result.discount > 0
            ? `${tr(messages, "coupons.success")} ${result.discount} ${result.currency ?? "DZD"}`
            : tr(messages, "coupons.activated")}
        </StatusMessage>
      ) : null}
    </MenuScaffold>
  )
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    height: 150,
    alignSelf: "center",
  },
  blurb: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
})

export default CouponsScreen
