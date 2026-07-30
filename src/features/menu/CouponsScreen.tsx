/**
 * كوبوناتي — Coupons page (drawer item 4).
 *
 * One input, one button. Validation is delegated to the EXISTING endpoint
 * `passengerServicesApi.validateCoupon` (POST /coupons/validate). No local
 * rules, no caching of "activated" coupons, no new state on the server — the
 * screen only renders what the API answers.
 */
import React, { useState } from "react"
import { StyleSheet, Text } from "react-native"
import { useMutation } from "@tanstack/react-query"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { passengerServicesApi } from "../../core/passenger-api"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"
import { useTheme } from "../../core/theme-store"
import type { RootStackParamList } from "../../navigation/types"
import {
	Card,
	LabeledInput,
	MenuScaffold,
	PrimaryAction,
	StatusMessage,
} from "../../components/menu/MenuScaffold"
import { TicketIcon } from "../../components/icons/Icons"
import { colors, iconSize, spacing, typography } from "../../design/theme"

type Props = NativeStackScreenProps<RootStackParamList, "Coupons">

/**
 * The endpoint validates a code against a fare. Outside a ride there is no
 * fare yet, so we send 0 — exactly what the app already does when it checks a
 * code before a quote exists.
 */
const NO_FARE = 0

export function CouponsScreen({ navigation }: Props) {
	const { messages } = useMessages()
	const { palette } = useTheme()
	const [code, setCode] = useState("")

	const activate = useMutation({
		mutationFn: () =>
			passengerServicesApi.validateCoupon(code.trim().toUpperCase(), NO_FARE),
	})

	const result = activate.data

	return (
		<MenuScaffold
			title={tr(messages, "coupons.title")}
			subtitle={tr(messages, "coupons.subtitle")}
			onBack={() => navigation.goBack()}
		>
			<Card>
				<Text style={[styles.blurb, { color: palette.textMuted }]}>
					{tr(messages, "coupons.blurb")}
				</Text>
			</Card>

			<LabeledInput
				label={tr(messages, "coupons.code")}
				value={code}
				onChangeText={(text) => {
					setCode(text)
					activate.reset()
				}}
				placeholder="FLAMINGO2026"
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

			{result ? (
				result.valid ? (
					<StatusMessage>
						{`${tr(messages, "coupons.success")} ${result.discount} ${result.currency ?? "DZD"}`}
					</StatusMessage>
				) : (
					<StatusMessage danger>{tr(messages, "coupons.expired")}</StatusMessage>
				)
			) : null}
		</MenuScaffold>
	)
}

const styles = StyleSheet.create({
	blurb: {
		...typography.body,
		marginBottom: spacing.xs,
	},
})

export default CouponsScreen
