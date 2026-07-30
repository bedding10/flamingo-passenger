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
import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
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

	const balance = wallet.data?.balance ?? 0
	const currency = wallet.data?.currency ?? "DZD"

	return (
		<MenuScaffold
			title={tr(messages, "wallet.title")}
			subtitle={tr(messages, "wallet.subtitle")}
			onBack={() => navigation.goBack()}
			loading={wallet.isLoading}
		>
			<Card>
				<Text style={[styles.blurb, { color: palette.textMuted }]}>
					{tr(messages, "wallet.blurb")}
				</Text>
				<Text style={[styles.balanceLabel, { color: palette.textMuted }]}>
					{tr(messages, "wallet.current")}
				</Text>
				<Text style={styles.balance}>
					{Number(balance).toLocaleString(locale)}{" "}
					<Text style={styles.currency}>{currency}</Text>
				</Text>
				{wallet.data?.lockedBalance ? (
					<InfoRow
						title={tr(messages, "wallet.temporaryLocked")}
						value={`${wallet.data.lockedBalance} ${currency}`}
					/>
				) : null}
			</Card>

			<PrimaryAction
				label={tr(messages, "wallet.topUp")}
				onPress={() => setMode("receive")}
				leading={<QrIcon size={iconSize.md} color={colors.black} />}
			/>
			<GhostAction
				label={tr(messages, "wallet.sendBalance")}
				onPress={() => {
					setScanned(null)
					setMode("send")
				}}
				leading={<SendIcon size={iconSize.md} />}
			/>

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
								title={item.transaction?.reason ?? item.transaction?.type ?? tr(messages, "common.operation")}
								subtitle={new Date(item.createdAt).toLocaleString(locale)}
								value={`${item.amount} ${currency}`}
							/>
						))}
					</Card>
				</>
			) : null}

			{/* ── QR sheets ───────────────────────────────────────────── */}
			<Modal
				visible={mode !== "none"}
				animationType="slide"
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
	blurb: {
		...typography.body,
		marginBottom: spacing.sm,
	},
	balanceLabel: {
		...typography.caption,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	balance: {
		...typography.display,
		fontSize: 36,
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
