/**
 * رحلاتي — Trips page (drawer item 3).
 *
 * Reads the EXISTING endpoint `passengerServicesApi.trips` (GET /rides/mine)
 * and simply splits the returned list into "القادمة" (still active) and
 * "السابقة" (finished or cancelled) for display. No filter is sent to the
 * server, no logic is added, no status is reinterpreted.
 */
import React, { useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { passengerServicesApi } from "../../core/passenger-api"
import { useTheme } from "../../core/theme-store"
import type { Trip } from "../../core/contracts"
import type { RootStackParamList } from "../../navigation/types"
import {
	MenuScaffold,
	SectionLabel,
} from "../../components/menu/MenuScaffold"
import {
	colors,
	radius,
	spacing,
	typography,
} from "../../design/theme"

type Props = NativeStackScreenProps<RootStackParamList, "Trips">

/** Statuses the app already treats as an in-flight ride. */
const ACTIVE = new Set([
	"SEARCHING",
	"ACCEPTED",
	"ARRIVING",
	"IN_PROGRESS",
])

const STATUS_LABEL: Record<string, string> = {
	SEARCHING: "بحث عن سائق",
	ACCEPTED: "تم القبول",
	ARRIVING: "السائق في الطريق",
	IN_PROGRESS: "رحلة جارية",
	COMPLETED: "مكتملة",
	CANCELLED: "ملغاة",
}

const TripCard: React.FC<{ trip: Trip; onPress: () => void }> = ({
	trip,
	onPress,
}) => {
	const { palette } = useTheme()
	const createdAt = typeof trip.createdAt === "string" ? trip.createdAt : null
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			android_ripple={{ color: colors.pressed }}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor: palette.surfaceAlt,
					borderColor: palette.border,
				},
				pressed && styles.dimmed,
			]}
		>
			<View style={styles.cardHead}>
				<Text style={styles.status}>
					{STATUS_LABEL[trip.status] ?? trip.status}
				</Text>
				{trip.fare != null ? (
					<Text style={styles.fare}>
						{trip.fare} {trip.currency ?? "DZD"}
					</Text>
				) : null}
			</View>

			<View style={styles.leg}>
				<View style={styles.dot} />
				<Text
					style={[styles.address, { color: palette.text }]}
					numberOfLines={1}
				>
					{trip.pickupAddress ?? "—"}
				</Text>
			</View>
			<View style={styles.leg}>
				<View style={styles.square} />
				<Text
					style={[styles.address, { color: palette.text }]}
					numberOfLines={1}
				>
					{trip.destAddress ?? "—"}
				</Text>
			</View>

			{createdAt ? (
				<Text style={[styles.date, { color: palette.textMuted }]}>
					{new Date(createdAt).toLocaleString("fr-DZ")}
				</Text>
			) : null}
		</Pressable>
	)
}

export function TripsScreen({ navigation }: Props) {
	const { palette } = useTheme()
	const trips = useQuery({
		queryKey: ["trips", 1],
		queryFn: () => passengerServicesApi.trips(1),
		staleTime: 30_000,
	})

	const { upcoming, past } = useMemo(() => {
		const items = trips.data?.items ?? []
		return {
			upcoming: items.filter((trip) => ACTIVE.has(trip.status)),
			past: items.filter((trip) => !ACTIVE.has(trip.status)),
		}
	}, [trips.data])

	const empty = !trips.isLoading && !upcoming.length && !past.length

	return (
		<MenuScaffold
			title="رحلاتي"
			subtitle="القادمة والسابقة"
			onBack={() => navigation.goBack()}
			loading={trips.isLoading}
		>
			{empty ? (
				<Text style={[styles.empty, { color: palette.textMuted }]}>
					لا توجد رحلات بعد.
				</Text>
			) : null}

			{upcoming.length ? (
				<>
					<SectionLabel>الرحلات القادمة</SectionLabel>
					{upcoming.map((trip) => (
						<TripCard
							key={trip.id}
							trip={trip}
							onPress={() =>
								navigation.navigate("TripDetails", { tripId: trip.id })
							}
						/>
					))}
				</>
			) : null}

			{past.length ? (
				<>
					<SectionLabel>الرحلات السابقة</SectionLabel>
					{past.map((trip) => (
						<TripCard
							key={trip.id}
							trip={trip}
							onPress={() =>
								navigation.navigate("TripDetails", { tripId: trip.id })
							}
						/>
					))}
				</>
			) : null}
		</MenuScaffold>
	)
}

const styles = StyleSheet.create({
	dimmed: { opacity: 0.7 },
	card: {
		borderRadius: radius.lg,
		borderWidth: StyleSheet.hairlineWidth,
		padding: spacing.lg,
		gap: spacing.xs,
	},
	cardHead: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing.xs,
	},
	status: {
		...typography.caption,
		fontWeight: "800",
		color: colors.gold,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	fare: {
		...typography.subtitle,
		fontWeight: "800",
		color: colors.gold,
	},
	leg: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: radius.pill,
		backgroundColor: colors.gold,
	},
	square: {
		width: 8,
		height: 8,
		borderRadius: 2,
		borderWidth: 1.5,
		borderColor: colors.gold,
	},
	address: {
		...typography.body,
		flex: 1,
	},
	date: {
		...typography.caption,
		marginTop: spacing.xs,
	},
	empty: {
		...typography.body,
		textAlign: "center",
		paddingVertical: spacing["3xl"],
	},
})

export default TripsScreen
