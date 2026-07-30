/**
 * WalletQr — displays the passenger's own wallet QR code so it can be scanned
 * to top the wallet up. Display only: it renders a value, it never calls the
 * API and it never mutates a balance.
 *
 * `react-native-qrcode-svg` is required lazily so the wallet page stays cheap
 * for users who never open this sheet.
 */
import React, { useEffect, useState, type ComponentType } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useTheme } from "../../core/theme-store"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"
import { colors, radius, spacing, typography } from "../../design/theme"

type QrProps = {
	value: string
	size?: number
	color?: string
	backgroundColor?: string
}

export const WalletQr: React.FC<{ value: string; name?: string }> = ({
	value,
	name,
}) => {
	const { palette } = useTheme()
	const { messages } = useMessages()
	const [Qr, setQr] = useState<ComponentType<QrProps> | null>(null)

	useEffect(() => {
		let alive = true
		import("react-native-qrcode-svg")
			.then((module) => {
				if (alive) setQr(() => module.default as ComponentType<QrProps>)
			})
			.catch(() => undefined)
		return () => {
			alive = false
		}
	}, [])

	return (
		<View style={styles.root}>
			<Text style={[styles.title, { color: palette.text }]}>{tr(messages, "wallet.topUp")}</Text>
			<Text style={[styles.hint, { color: palette.textMuted }]}>
				{tr(messages, "wallet.qrHint")}
			</Text>

			<View style={styles.frame}>
				{Qr ? (
					<Qr
						value={value}
						size={216}
						color={colors.black}
						backgroundColor={colors.white}
					/>
				) : (
					<ActivityIndicator color={colors.black} />
				)}
			</View>

			{name ? (
				<Text style={[styles.name, { color: palette.text }]}>{name}</Text>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		alignItems: "center",
		paddingHorizontal: spacing.xl,
		gap: spacing.md,
	},
	title: { ...typography.display },
	hint: { ...typography.body, textAlign: "center" },
	frame: {
		marginTop: spacing.xl,
		padding: spacing.lg,
		borderRadius: radius.lg,
		backgroundColor: colors.white,
		borderWidth: 2,
		borderColor: colors.gold,
		width: 260,
		height: 260,
		alignItems: "center",
		justifyContent: "center",
	},
	name: {
		...typography.subtitle,
		marginTop: spacing.lg,
	},
})

export default WalletQr
