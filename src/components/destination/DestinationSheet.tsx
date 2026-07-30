/**
 * DestinationSheet — flaminGO bottom sheet, rebuilt from scratch on
 * @gorhom/bottom-sheet. The previous sheet is gone: nothing of it remains.
 *
 * ── Behaviour (Heetch parity) ──────────────────────────────────────────
 * • INVERTED against the map: light map → charcoal sheet, dark map → white.
 * • SMALL top corner radius (12), never the old 32pt pillow.
 * • Collapsed: just the headline "إلى أين تريد الذهاب؟" + the search field.
 * • Tapping the field NEVER opens a screen — the same sheet expands.
 * • Fully draggable: three snap points, free-form drag, no forced close.
 * • Expanded: pickup │ destination rail, then Current location / Set on map /
 *   Favorites / Recent, then live suggestions — all inside the sheet.
 * • `onSnapChange` lets the map hide the menu + theme buttons while open.
 *
 * PURE UI: search, geocoding, routing and ride logic stay in the parent.
 */
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetFlatList,
	BottomSheetView,
	type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet"
import React, {
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type ReactElement,
} from "react"
import {
	ActivityIndicator,
	I18nManager,
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
	surfacesFor,
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
import RouteRows, { type RouteTarget } from "./RouteRows"
import SearchField from "./SearchField"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"

export type PlaceKind = "recent" | "saved" | "favorite" | "suggestion"

export type PlaceItem = {
	id: string
	title: string
	subtitle?: string
	kind: PlaceKind
}

export type DestinationSheetCopy = {
	/** Collapsed headline. */
	title: string
	searchPlaceholder: string
	pickupPlaceholder: string
	destinationPlaceholder: string
	currentLocation: string
	setOnMap: string
	favorites: string
	recent: string
	noResults: string
}

export type DestinationSheetHandle = {
	/** Expand the sheet and focus the search field. */
	expand: () => void
	/** Return to the collapsed headline + search state. */
	collapse: () => void
}

export type DestinationSheetProps = {
	/** Theme the MAP is drawn with — the sheet inverts it. */
	mapTheme: "light" | "dark"
	/** Text currently typed by the user (controlled by the parent). */
	query: string
	onChangeQuery: (text: string) => void
	/** Suggestions produced by the parent's existing search logic. */
	suggestions: PlaceItem[]
	searching?: boolean
	favorites?: PlaceItem[]
	recent?: PlaceItem[]
	pickupLabel: string
	destinationLabel: string
	/** Which point the user is currently editing. */
	activeTarget: RouteTarget
	onChangeTarget: (target: RouteTarget) => void
	onSelectPlace: (place: PlaceItem) => void
	onUseCurrentLocation: () => void
	onSetOnMap: () => void
	/** Fired on every snap change so the map can hide its floating buttons. */
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

const DestinationSheetInner: React.ForwardRefRenderFunction<
	DestinationSheetHandle,
	DestinationSheetProps
> = (
	{
		mapTheme,
		query,
		onChangeQuery,
		suggestions,
		searching = false,
		favorites = [],
		recent = [],
		pickupLabel,
		destinationLabel,
		activeTarget,
		onChangeTarget,
		onSelectPlace,
		onUseCurrentLocation,
		onSetOnMap,
		onSnapChange,
		copy: copyOverride,
	},
	ref,
) => {
	const sheetRef = useRef<BottomSheet>(null)
	const { messages } = useMessages()
	const inputRef = useRef<TextInput>(null)
	const [index, setIndex] = useState(0)

	const surfaces = useMemo(() => surfacesFor(mapTheme), [mapTheme])
	const copy = useMemo<DestinationSheetCopy>(
		() => ({
			title: tr(messages, "destination.title"),
			searchPlaceholder: tr(messages, "destination.search"),
			pickupPlaceholder: tr(messages, "destination.pickup"),
			destinationPlaceholder: tr(messages, "destination.dropoff"),
			currentLocation: tr(messages, "destination.current"),
			setOnMap: tr(messages, "destination.setOnMap"),
			favorites: tr(messages, "destination.favorites"),
			recent: tr(messages, "destination.recent"),
			noResults: tr(messages, "destination.noResults"),
			...copyOverride,
		}),
		[messages, copyOverride],
	)

	/**
	 * Collapsed → half → full. Between them the sheet is freely draggable and
	 * can be released at any height (gorhom keeps the momentum).
	 */
	const snapPoints = useMemo(() => ["22%", "55%", "92%"], [])
	const expanded = index > 0
	const searchMode = query.trim().length > 0

	const expand = useCallback(() => {
		sheetRef.current?.snapToIndex(2)
		requestAnimationFrame(() => inputRef.current?.focus())
	}, [])

	const collapse = useCallback(() => {
		Keyboard.dismiss()
		sheetRef.current?.snapToIndex(0)
	}, [])

	useImperativeHandle(ref, () => ({ expand, collapse }), [expand, collapse])

	const handleChange = useCallback(
		(next: number) => {
			setIndex(next)
			onSnapChange?.(next)
			if (next <= 0) Keyboard.dismiss()
		},
		[onSnapChange],
	)

	/** Tapping outside brings the sheet back to the collapsed state. */
	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				appearsOnIndex={1}
				disappearsOnIndex={0}
				opacity={0.4}
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
				entries.push({ type: "place", id: `${prefix}-${place.id}`, place }),
			)
		}
		// Order requested: Favorites, then Recent.
		push(copy.favorites, favorites, "fav")
		push(copy.recent, recent, "rec")
		return entries
	}, [copy, favorites, recent, searchMode, suggestions])

	const renderItem = useCallback(
		({ item }: { item: ListEntry }) => {
			if (item.type === "section") {
				return (
					<Text style={[styles.sectionLabel, { color: surfaces.textMuted }]}>
						{item.label}
					</Text>
				)
			}
			return (
				<PlaceRow
					surfaces={surfaces}
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
		[onSelectPlace, surfaces],
	)

	/** Expanded header: the rail + the live search field + the two shortcuts. */
	const header = (
		<View style={styles.headerBlock}>
			<RouteRows
				surfaces={surfaces}
				pickupLabel={pickupLabel}
				pickupPlaceholder={copy.pickupPlaceholder}
				destinationLabel={destinationLabel}
				destinationPlaceholder={copy.destinationPlaceholder}
				onPressPickup={() => {
					onChangeTarget("pickup")
					expand()
				}}
				onPressDestination={() => {
					onChangeTarget("destination")
					expand()
				}}
				active={activeTarget}
			/>

			<SearchField
				ref={inputRef}
				surfaces={surfaces}
				value={query}
				onChangeText={onChangeQuery}
				placeholder={copy.searchPlaceholder}
				trailing={
					searching ? (
						<ActivityIndicator size="small" color={colors.gold} />
					) : undefined
				}
			/>

			{!searchMode && (
				<View style={styles.quickActions}>
					<PlaceRow
						surfaces={surfaces}
						title={copy.currentLocation}
						icon={<TargetIcon size={iconSize.md} />}
						onPress={onUseCurrentLocation}
					/>
					<PlaceRow
						surfaces={surfaces}
						title={copy.setOnMap}
						icon={<MapPinIcon size={iconSize.md} />}
						onPress={onSetOnMap}
					/>
				</View>
			)}
		</View>
	)

	return (
		<BottomSheet
			ref={sheetRef}
			index={0}
			snapPoints={snapPoints}
			onChange={handleChange}
			enableDynamicSizing={false}
			enablePanDownToClose={false}
			enableOverDrag
			keyboardBehavior="interactive"
			keyboardBlurBehavior="restore"
			androidKeyboardInputMode="adjustResize"
			backdropComponent={renderBackdrop}
			backgroundStyle={[
				styles.sheetBackground,
				{ backgroundColor: surfaces.sheet },
			]}
			handleIndicatorStyle={[
				styles.handle,
				{ backgroundColor: surfaces.handle },
			]}
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
							<Text style={[styles.empty, { color: surfaces.textMuted }]}>
								{copy.noResults}
							</Text>
						) : null
					}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContent}
				/>
			) : (
				<BottomSheetView style={styles.collapsed}>
					<Text
						style={[styles.headline, { color: surfaces.text }]}
						numberOfLines={2}
					>
						{copy.title}
					</Text>
					<SearchField
						surfaces={surfaces}
						readOnly
						value={destinationLabel}
						placeholder={copy.searchPlaceholder}
						onPress={() => {
							onChangeTarget("destination")
							expand()
						}}
					/>
				</BottomSheetView>
			)}
		</BottomSheet>
	)
}

const styles = StyleSheet.create({
	/** Small corners — the single most Heetch-defining detail. */
	sheetBackground: {
		borderTopLeftRadius: radius.sheet,
		borderTopRightRadius: radius.sheet,
	},
	sheetShadow: {
		...shadows.sheet,
	},
	handle: {
		width: 38,
		height: 4,
		borderRadius: radius.xs,
	},
	collapsed: {
		paddingHorizontal: spacing.xl,
		paddingTop: spacing.sm,
		gap: spacing.lg,
	},
	headline: {
		...typography.headline,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	headerBlock: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.sm,
		gap: spacing.md,
	},
	quickActions: {
		marginTop: spacing.xs,
	},
	sectionLabel: {
		...typography.caption,
		fontWeight: "700",
		letterSpacing: 0.6,
		textTransform: "uppercase",
		paddingHorizontal: spacing.xl,
		paddingTop: spacing.lg,
		paddingBottom: spacing.xs,
		textAlign: I18nManager.isRTL ? "right" : "left",
	},
	listContent: {
		paddingBottom: spacing["4xl"],
	},
	empty: {
		...typography.body,
		textAlign: "center",
		paddingVertical: spacing["3xl"],
	},
})

const DestinationSheet = React.forwardRef(DestinationSheetInner)
DestinationSheet.displayName = "DestinationSheet"

export default DestinationSheet
