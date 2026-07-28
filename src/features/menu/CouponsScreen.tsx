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
import { iconSize, spacing, typography } from "../../design/theme"

type Props = NativeStackScreenProps<RootStackParamList, "Coupons">

/**
 * The endpoint validates a code against a fare. Outside a ride there is no
 * fare yet, so we send 0 — exactly what the app already does when it checks a
 * code before a quote exists.
 */
const NO_FARE = 0

export function CouponsScreen({ navigation }: Props) {
	const { palette } = useTheme()
	const [code, setCode] = useState("")

	const activate = useMutation({
		mutationFn: () =>
			passengerServicesApi.validateCoupon(code.trim().toUpperCase(), NO_FARE),
	})

	const result = activate.data

	return (
		<MenuScaffold
			title="كوبوناتي"
			subtitle="فعّل كود الخصم الخاص بك"
			onBack={() => navigation.goBack()}
		>
			<Card>
				<Text style={[styles.blurb, { color: palette.textMuted }]}>
					أدخل كود الكوبون ثم اضغط تفعيل، وسيُطبّق الخصم تلقائياً على رحلتك
					القادمة.
				</Text>
			</Card>

			<LabeledInput
				label="كود الكوبون"
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
				label="تفعيل"
				onPress={() => activate.mutate()}
				disabled={code.trim().length < 3}
				loading={activate.isPending}
				leading={<TicketIcon size={iconSize.md} color="#111111" />}
			/>

			{activate.isError ? (
				<StatusMessage danger>تعذر التحقق من الكود، حاول مجدداً</StatusMessage>
			) : null}

			{result ? (
				result.valid ? (
					<StatusMessage>
						{`تم تفعيل الكوبون — خصم ${result.discount} ${result.currency ?? "DZD"}`}
					</StatusMessage>
				) : (
					<StatusMessage danger>الكود غير صالح أو منتهٍ</StatusMessage>
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
