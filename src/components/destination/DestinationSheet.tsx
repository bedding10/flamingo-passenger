/**
 * DestinationSheet — flaminGO destination picker, rebuilt from scratch on
 * @gorhom/bottom-sheet. Replaces the old sheet + the old "رجوع" button entirely.
 *
 * • Snap points: collapsed / half / expanded.
 * • Collapsed: centered title + large premium search field.
 * • Expanded: drag handle, pickup + destination rows with vertical connector,
 *   current location, set on map, recent, saved, favorites.
 * • Typing renders suggestions INSIDE the same sheet — never a new screen.
 * • Closes only by dragging down or tapping outside (backdrop).
 *
 * PURE UI: search/geocoding/ride logic stays in the parent. This component only
 * calls the callbacks it is given.
 */
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetFlatList,
	BottomSheetView,
	type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet"
import React, {
	useCallback,
	useMemo,
	useRef,
	useState,
	type ReactElement,
} from "react"
import {
	ActivityIndicator,
	Keyboard,
	StyleSheet,
	Text,
	View,
	type TextInput,
} from "react-native"
import {
	colors,
	iconSize,
	radius,
	shadows,
	spacing,
	typography,
} from "../../design/theme"
import {
	ClockIcon,
	HomeIcon,
	MapPinIcon,
	StarIcon,
	TargetIcon,
} from "../icons/Icons"
import PlaceRow from "./PlaceRow"
import RouteRows from "./RouteRows"
import SearchField from "./SearchField"

export type PlaceKind = "recent" | "saved" | "favorite" | "suggestion"

export type PlaceItem = {
	id: string
	title: string
	subtitle?: string
	kind: PlaceKind
}

export type DestinationSheetCopy = {
	/** Collapsed centered title. */
	title: string
	searchPlaceholder: string
	pickupPlaceholder: string
	destinationPlaceholder: string
	currentLocation: string
	setOnMap: string
	recent: string
	saved: string
	favorites: string
	noResults: string
}

export const defaultCopyAr: DestinationSheetCopy = {
	title: "إلى أين تريد الذهاب؟",
	searchPlaceholder: "ابحث عن مكان",
	pickupPlaceholder: "موقع الانطلاق",
	destinationPlaceholder: "إلى أين؟",
	currentLocation: "موقعي الحالي",
	setOnMap: "تحديد على الخريطة",
	recent: "الأماكن الأخيرة",
	saved: "الأماكن المحفوظة",
	favorites: "المفضلة",
	noResults: "لا توجد نتائج",
}

export type DestinationSheetProps = {
	/** Text currently typed by the user (controlled by the parent). */
	query: string
	onChangeQuery: (text: string) => void
	/** Suggestions produced by the parent's existing search logic. */
	suggestions: PlaceItem[]
	searching?: boolean
	recent?: PlaceItem[]
	saved?: PlaceItem[]
	favorites?: PlaceItem[]
	pickupLabel: string
	destinationLabel: string
	onSelectPlace: (place: PlaceItem) => void
	onUseCurrentLocation: () => void
	onSetOnMap: () => void
	/** Called when the sheet is dismissed by drag-down or backdrop tap. */
	onClose?: () => void
	/** Notifies the parent so it can hide pin bubbles while expanded, etc. */
	onSnapChange?: (index: number) => void
	copy?: Partial<DestinationSheetCopy>
}

type ListEntry =
	| { type: "section"; id: string; label: string }
	| { type: "place"; id: string; place: PlaceItem }

const iconForKind = (kind: PlaceKind): ReactElement => {
	switch (kind) {
		case "favorite":
			return <StarIcon size={iconSize.md} />
		case "saved":
			return <HomeIcon size={iconSize.md} />
		case "recent":
			return <ClockIcon size={iconSize.md} />
		default:
			return <MapPinIcon size={iconSize.md} />
	}
}

const DestinationSheet: React.FC<DestinationSheetProps> = ({
	query,
	onChangeQuery,
	suggestions,
	searching = false,
	recent = [],
	saved = [],
	favorites = [],
	pickupLabel,
	destinationLabel,
	onSelectPlace,
	onUseCurrentLocation,
	onSetOnMap,
	onClose,
	onSnapChange,
	copy: copyOverride,
}) => {
	const sheetRef = useRef<BottomSheet>(null)
	const inputRef = useRef<TextInput>(null)
	const [index, setIndex] = useState(0)

	const copy = useMemo(
		() => ({ ...defaultCopyAr, ...copyOverride }),
		[copyOverride],
	)

	/** Collapsed → half → expanded. */
	const snapPoints = useMemo(() => ["26%", "55%", "92%"], [])
	const expanded = index > 0
	const searchMode = query.trim().length > 0

	const handleChange = useCallback(
		(next: number) => {
			setIndex(next)
			onSnapChange?.(next)
			if (next <= 0) {
				Keyboard.dismiss()
				onClose?.()
			}
		},
		[onClose, onSnapChange],
	)

	const expand = useCallback(() => {
		sheetRef.current?.snapToIndex(2)
		requestAnimationFrame(() => inputRef.current?.focus())
	}, [])

	const collapse = useCallback(() => {
		Keyboard.dismiss()
		sheetRef.current?.snapToIndex(0)
	}, [])

	/** Backdrop: tapping outside collapses the sheet (Heetch behaviour). */
	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				appearsOnIndex={1}
				disappearsOnIndex={0}
				opacity={0.45}
				pressBehavior="collapse"
				onPress={collapse}
			/>
		),
		[collapse],
	)

	const data = useMemo<ListEntry[]>(() => {
		if (searchMode) {
			return suggestions.map((place) => ({
				type: "place" as const,
				id: `s-${place.id}`,
				place,
			}))
		}
		const entries: ListEntry[] = []
		const push = (label: string, items: PlaceItem[], prefix: string) => {
			if (!items.length) return
			entries.push({ type: "section", id: `sec-${prefix}`, label })
			items.forEach((place) =>
				entries.push({
					type: "place",
					id: `${prefix}-${place.id}`,
					place,
				}),
			)
		}
		push(copy.favorites, favorites, "fav")
		push(copy.saved, saved, "sav")
		push(copy.recent, recent, "rec")
		return entries
	}, [copy, favorites, recent, saved, searchMode, suggestions])

	const renderItem = useCallback(
		({ item }: { item: ListEntry }) => {
			if (item.type === "section") {
				return <Text style={styles.sectionLabel}>{item.label}</Text>
			}
			return (
				<PlaceRow
					title={item.place.title}
					subtitle={item.place.subtitle}
					icon={iconForKind(item.place.kind)}
					onPress={() => {
						Keyboard.dismiss()
						onSelectPlace(item.place)
					}}
				/>
			)
		},
		[onSelectPlace],
	)

	const header = (
		<View style={styles.headerBlock}>
			<RouteRows
				pickupLabel={pickupLabel}
				pickupPlaceholder={copy.pickupPlaceholder}
				destinationLabel={destinationLabel}
				destinationPlaceholder={copy.destinationPlaceholder}
				onPressPickup={expand}
				onPressDestination={expand}
				active="destination"
			/>

			<View style={styles.searchWrap}>
				<SearchField
					ref={inputRef}
					value={query}
					onChangeText={onChangeQuery}
					placeholder={copy.searchPlaceholder}
					onFocus={expand}
				/>
			</View>

			{!searchMode && (
				<View style={styles.quickActions}>
					<PlaceRow
						title={copy.currentLocation}
						icon={<TargetIcon size={iconSize.md} />}
						onPress={onUseCurrentLocation}
					/>
					<PlaceRow
						title={copy.setOnMap}
						icon={<MapPinIcon size={iconSize.md} />}
						onPress={onSetOnMap}
					/>
				</View>
			)}

			{searchMode && searching && (
				<ActivityIndicator color={colors.gold} style={styles.loader} />
			)}
		</View>
	)

	return (
		<BottomSheet
			ref={sheetRef}
			index={0}
			snapPoints={snapPoints}
			onChange={handleChange}
			enablePanDownToClose={false}
			keyboardBehavior="interactive"
			keyboardBlurBehavior="restore"
			androidKeyboardInputMode="adjustResize"
			backdropComponent={renderBackdrop}
			backgroundStyle={styles.sheetBackground}
			handleIndicatorStyle={styles.handle}
			style={styles.sheetShadow}
		>
			{expanded ? (
				<BottomSheetFlatList
					data={data}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					ListHeaderComponent={header}
					ListEmptyComponent={
						searchMode && !searching ? (
							<Text style={styles.empty}>{copy.noResults}</Text>
						) : null
					}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContent}
				/>
			) : (
				<BottomSheetView style={styles.collapsed}>
					<Text style={styles.collapsedTitle} numberOfLines={2}>
						{copy.title}
					</Text>
					<SearchField
						readOnly
						value={destinationLabel}
						placeholder={copy.searchPlaceholder}
						onPress={expand}
					/>
				</BottomSheetView>
			)}
		</BottomSheet>
	)
}

const styles = StyleSheet.create({
	sheetBackground: {
		backgroundColor: colors.white,
		borderTopLeftRadius: radius.sheet,
		borderTopRightRadius: radius.sheet,
	},
	sheetShadow: {
		...shadows.sheet,
	},
	handle: {
		backgroundColor: colors.divider,
		width: 44,
		height: 5,
		borderRadius: radius.pill,
	},
	collapsed: {
		paddingHorizontal: spacing.xl,
		paddingTop: spacing.sm,
		paddingBottom: spacing["3xl"],
		gap: spacing.xl,
	},
	collapsedTitle: {
		...typography.title,
		color: colors.textPrimary,
		textAlign: "center",
	},
	headerBlock: {
		paddingBottom: spacing.sm,
		gap: spacing.lg,
	},
	searchWrap: {
		paddingHorizontal: spacing.xl,
	},
	quickActions: {
		paddingHorizontal: spacing.xs,
	},
	sectionLabel: {
		...typography.caption,
		fontWeight: "700",
		color: colors.textSecondary,
		paddingHorizontal: spacing.xl,
		paddingTop: spacing.lg,
		paddingBottom: spacing.sm,
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},
	listContent: {
		paddingBottom: spacing["4xl"],
		paddingHorizontal: spacing.xs,
	},
	loader: {
		marginTop: spacing.lg,
	},
	empty: {
		...typography.body,
		color: colors.textSecondary,
		textAlign: "center",
		paddingVertical: spacing["3xl"],
	},
})

export default DestinationSheet
