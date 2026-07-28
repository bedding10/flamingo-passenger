/**
 * مساعدة — Help page (drawer item 5).
 *
 * Phone prefilled from the session profile (still editable), one large message
 * box, one send button. The request goes to the EXISTING endpoint
 * `passengerServicesApi.createTicket` (POST /support/tickets); the phone is
 * appended to the message body because the endpoint takes
 * (subject, message, category) and we are not allowed to add a field.
 */
import React, { useState } from "react"
import { StyleSheet, Text } from "react-native"
import { useMutation } from "@tanstack/react-query"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { passengerServicesApi } from "../../core/passenger-api"
import { useSession } from "../../core/session-store"
import { useTheme } from "../../core/theme-store"
import type { RootStackParamList } from "../../navigation/types"
import {
	Card,
	LabeledInput,
	MenuScaffold,
	PrimaryAction,
	StatusMessage,
} from "../../components/menu/MenuScaffold"
import { SendIcon } from "../../components/icons/Icons"
import { iconSize, spacing, typography } from "../../design/theme"

type Props = NativeStackScreenProps<RootStackParamList, "Support">

export function HelpScreen({ navigation }: Props) {
	const { palette } = useTheme()
	const profile = useSession((state) => state.profile)
	const [phone, setPhone] = useState(profile?.phone ?? "")
	const [message, setMessage] = useState("")

	const send = useMutation({
		mutationFn: () =>
			passengerServicesApi.createTicket(
				"طلب مساعدة",
				`${message.trim()}\n\nرقم الهاتف: ${phone.trim()}`,
			),
		onSuccess: () => setMessage(""),
	})

	const ready = message.trim().length > 4 && phone.trim().length > 5

	return (
		<MenuScaffold
			title="مساعدة"
			subtitle="اشرح مشكلتك وسنرد عليك"
			onBack={() => navigation.goBack()}
		>
			<Card>
				<Text style={[styles.blurb, { color: palette.textMuted }]}>
					فريق flaminGO يستقبل طلبك مباشرة ويتواصل معك على الرقم المدوّن
					أدناه.
				</Text>
			</Card>

			<LabeledInput
				label="رقم الهاتف"
				value={phone}
				onChangeText={setPhone}
				keyboardType="phone-pad"
				placeholder="+213..."
			/>

			<LabeledInput
				label="مشكلتك"
				value={message}
				onChangeText={setMessage}
				placeholder="اكتب تفاصيل المشكلة..."
				area
			/>

			{send.isError ? (
				<StatusMessage danger>تعذر إرسال الطلب، حاول مجدداً</StatusMessage>
			) : null}
			{send.isSuccess ? (
				<StatusMessage>تم إرسال طلبك، سنرد عليك قريباً</StatusMessage>
			) : null}

			<PrimaryAction
				label="إرسال"
				onPress={() => send.mutate()}
				disabled={!ready}
				loading={send.isPending}
				leading={<SendIcon size={iconSize.md} color="#111111" />}
			/>
		</MenuScaffold>
	)
}

const styles = StyleSheet.create({
	blurb: {
		...typography.body,
		marginBottom: spacing.xs,
	},
})

export default HelpScreen
