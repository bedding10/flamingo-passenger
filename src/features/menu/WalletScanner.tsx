/**
 * WalletScanner — opens the camera and reads another passenger's wallet QR.
 *
 * UI ONLY, by design: it returns the scanned payload to the caller and stops
 * there. No transfer request is issued, because the current backend exposes no
 * wallet-to-wallet transfer endpoint and the brief explicitly forbids adding
 * new logic.
 *
 * `expo-camera` is required lazily so the permission prompt only appears the
 * first time the user taps "إرسال رصيد".
 */
import React, { useEffect, useRef, useState, type ComponentType } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useTheme } from "../../core/theme-store"
import { colors, radius, spacing, typography } from "../../design/theme"

type ScanResult = { data: string }

type CameraViewProps = {
	style?: unknown
	facing?: "back" | "front"
	barcodeScannerSettings?: { barcodeTypes: string[] }
	onBarcodeScanned?: (result: ScanResult) => void
}

type CameraModule = {
	CameraView: ComponentType<CameraViewProps>
	requestCameraPermissionsAsync: () => Promise<{ granted: boolean }>
}

export const WalletScanner: React.FC<{
	onScanned: (value: string) => void
}> = ({ onScanned }) => {
	const { palette } = useTheme()
	const [camera, setCamera] = useState<CameraModule | null>(null)
	const [granted, setGranted] = useState<boolean | null>(null)
	const handled = useRef(false)

	useEffect(() => {
		let alive = true
		;(async () => {
			try {
				const module = (await import("expo-camera")) as unknown as CameraModule
				const permission = await module.requestCameraPermissionsAsync()
				if (!alive) return
				setCamera(module)
				setGranted(permission.granted)
			} catch {
				if (alive) setGranted(false)
			}
		})()
		return () => {
			alive = false
		}
	}, [])

	if (granted === null) {
		return (
			<View style={styles.center}>
				<ActivityIndicator color={colors.gold} />
			</View>
		)
	}

	if (!granted || !camera) {
		return (
			<View style={styles.center}>
				<Text style={[styles.hint, { color: palette.textMuted }]}>
					نحتاج إذن الكاميرا لمسح رمز محفظة المستخدم الآخر.
				</Text>
			</View>
		)
	}

	const { CameraView } = camera

	return (
		<View style={styles.root}>
			<Text style={[styles.title, { color: palette.text }]}>إرسال رصيد</Text>
			<Text style={[styles.hint, { color: palette.textMuted }]}>
				وجّه الكاميرا نحو رمز QR الخاص بالمستخدم الآخر.
			</Text>

			<View style={styles.frame}>
				<CameraView
					style={StyleSheet.absoluteFill}
					facing="back"
					barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
					onBarcodeScanned={(result) => {
						if (handled.current) return
						handled.current = true
						onScanned(result.data)
					}}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		alignItems: "center",
		paddingHorizontal: spacing.xl,
		gap: spacing.sm,
	},
	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: spacing.xl,
	},
	title: { ...typography.display },
	hint: { ...typography.body, textAlign: "center" },
	frame: {
		marginTop: spacing.xl,
		width: 270,
		height: 270,
		borderRadius: radius.lg,
		overflow: "hidden",
		borderWidth: 2,
		borderColor: colors.gold,
		backgroundColor: colors.black,
	},
})

export default WalletScanner
