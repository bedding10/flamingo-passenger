/**
 * DestinationSheet — THE single bottom sheet of the passenger journey.
 *
 * ── One sheet, five stages ─────────────────────────────────────────
 * There is exactly ONE `BottomSheet` instance for the whole flow. A sheet is
 * never stacked on top of another sheet: the `stage` prop only swaps the
 * CONTENT of this one sheet and animates its height.
 *
 *   idle   → headline "إلى أين تريد الذهاب؟" + underlined search row
 *   search → pickup / stops / destination rail, live search, suggestions
 *   ride   → route summary, ride cards, price, request button (via children)
 *   trip   → live trip panel (via children)
 *   pin    → "drag the map" confirmation (via children)
 *
 * ── Geometry (Heetch parity, NovaRide identity) ────────────────────────
 * • Pinned to the bottom, NO top corner radius, NO shadow, NO card, no nested
 *   container: it reads as a natural extension of the screen.
 * • Background follows the app theme: white by day, near-black by night.
 * • Text follows the sheet; gold is reserved for the important elements.
 *
 * PURE UI: search, geocoding, routing and ride logic stay in the parent.
 */
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  colors,
  iconSize,
  radius,
  sheetSurfacesFor,
  spacing,
  touchTarget,
  typography,
  type Surfaces,
} from "../../design/theme";
import { useTextDirection } from "../../core/text-direction";
import { useLatinType } from "../../core/typeface";
import {
  ClockIcon,
  CloseIcon,
  HomeIcon,
  MapPinIcon,
  StarIcon,
  TargetIcon,
} from "../icons/Icons";
import PlaceRow from "./PlaceRow";
import RouteRows, { type RouteTarget } from "./RouteRows";
import SearchField from "./SearchField";
import { tr } from "../../core/i18n";
import { useMessages } from "../../core/use-messages";

export type PlaceKind = "recent" | "saved" | "favorite" | "suggestion";

export type PlaceItem = {
  id: string;
  title: string;
  subtitle?: string;
  kind: PlaceKind;
};

/** The single sheet's stages. One sheet, one stage at a time. */
export type SheetStage = "idle" | "search" | "ride" | "trip" | "pin";

export type DestinationSheetCopy = {
  /** Collapsed headline. */
  title: string;
  /** Placeholder of the collapsed row: "search for the destination". */
  searchDestination: string;
  searchPlaceholder: string;
  pickupPlaceholder: string;
  destinationPlaceholder: string;
  currentLocation: string;
  setOnMap: string;
  favorites: string;
  recent: string;
  noResults: string;
  addStop: string;
};

export type DestinationSheetProps = {
  /** Theme the APP is in. The sheet follows it (never inverts it). */
  mode: "light" | "dark";
  /** Which content the single sheet is currently showing. */
  stage: SheetStage;
  /** The user asked for the search stage (tap or upward drag). */
  onRequestSearch: () => void;
  /** The user dragged the sheet back down while searching. */
  onCloseSearch: () => void;
  /** Text currently typed by the user (controlled by the parent). */
  query: string;
  onChangeQuery: (text: string) => void;
  /** Suggestions produced by the parent's existing search logic. */
  suggestions: PlaceItem[];
  searching?: boolean;
  favorites?: PlaceItem[];
  recent?: PlaceItem[];
  pickupLabel: string;
  destinationLabel: string;
  /** Which point the user is currently editing. */
  activeTarget: RouteTarget;
  onChangeTarget: (target: RouteTarget) => void;
  onSelectPlace: (place: PlaceItem) => void;
  onUseCurrentLocation: () => void;
  onSetOnMap: () => void;
  /** "+" next to the pickup row. Omitted when the stop limit is reached. */
  onAddStop?: () => void;
  /** Intermediate stop rows rendered inside the rail. */
  stops?: Array<{ key: string; label: string; onPress: () => void }>;
  /** Fired on every snap change so the map can hide its floating buttons. */
  onSnapChange?: (index: number) => void;
  /**
   * True once BOTH the pickup and the destination are known. The gold "where
   * are you going?" banner is a pre-route state: once a route exists the sheet
   * must never fall back to it, whatever the drag / keyboard does. Closing the
   * search then lands on the confirmed route instead.
   */
  routeReady?: boolean;
  copy?: Partial<DestinationSheetCopy>;
  /** Stage content for `ride`, `trip` and `pin`. */
  children?: React.ReactNode;
};

type ListEntry =
  | { type: "section"; id: string; label: string }
  | { type: "place"; id: string; place: PlaceItem };

const iconForKind = (kind: PlaceKind): ReactElement => {
  switch (kind) {
    case "favorite":
      return <StarIcon size={iconSize.md} />;
    case "saved":
      return <HomeIcon size={iconSize.md} />;
    case "recent":
      return <ClockIcon size={iconSize.md} />;
    default:
      return <MapPinIcon size={iconSize.md} />;
  }
};

/**
 * Collapsed → mid → full. The same sheet simply grows and shrinks.
 *
 * The collapsed stop is measured from the banner itself rather than fixed at a
 * percentage: a percentage taller than the content leaves a dead gold gap under
 * the search line on tall screens.
 */
const BANNER_FALLBACK_HEIGHT = 220;

/**
 * The collapsed banner is a solid gold block, so everything drawn inside it is
 * ink-on-gold rather than the usual sheet surfaces.
 */
const BANNER_SURFACES: Surfaces = {
  sheet: colors.gold,
  field: colors.gold,
  fieldPressed: "rgba(28,30,34,0.06)",
  text: colors.textOnLight,
  textMuted: colors.textOnLightMuted,
  divider: colors.textOnLight,
  button: colors.ink,
  onButton: colors.gold,
  handle: "rgba(28,30,34,0.28)",
};

/** One stage → one height. This is what makes the transition read as "expand". */
const indexForStage = (stage: SheetStage): number => {
  switch (stage) {
    case "search":
      return 2;
    case "ride":
    case "trip":
      return 1;
    default:
      return 0;
  }
};

const DestinationSheet: React.FC<DestinationSheetProps> = ({
  mode,
  stage,
  onRequestSearch,
  onCloseSearch,
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
  onAddStop,
  stops = [],
  onSnapChange,
  routeReady = false,
  copy: copyOverride,
  children,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const { messages } = useMessages();
  const inputRef = useRef<TextInput>(null);
  const type = useLatinType();
  // TEXT direction only: the sheet, the rows and the handle never move.
  const { textAlign, writingDirection } = useTextDirection();

  const surfaces = useMemo(() => sheetSurfacesFor(mode), [mode]);
  const copy = useMemo<DestinationSheetCopy>(
    () => ({
      title: tr(messages, "destination.title"),
      searchDestination: tr(messages, "destination.searchDestination"),
      searchPlaceholder: tr(messages, "destination.search"),
      pickupPlaceholder: tr(messages, "destination.pickup"),
      destinationPlaceholder: tr(messages, "destination.dropoff"),
      currentLocation: tr(messages, "destination.current"),
      setOnMap: tr(messages, "destination.setOnMap"),
      favorites: tr(messages, "destination.favorites"),
      recent: tr(messages, "destination.recent"),
      noResults: tr(messages, "destination.noResults"),
      addStop: tr(messages, "destination.addStop"),
      ...copyOverride,
    }),
    [messages, copyOverride],
  );

  /**
   * The banner is only reachable while no route exists. `stage` may still say
   * "idle" for a frame while the parent settles; this collapses that case onto
   * the confirmed-route stage so the gold banner can never flash back.
   */
  const effectiveStage: SheetStage =
    stage === "idle" && routeReady ? "ride" : stage;
  const isBanner = effectiveStage === "idle";
  const targetIndex = indexForStage(effectiveStage);
  const searchMode = query.trim().length > 0;

  /**
   * Measured height of the gold banner. Until the first layout pass we use a
   * sensible fallback; afterwards the collapsed snap point hugs the content
   * exactly, on any screen size and with any headline length.
   */
  const [bannerHeight, setBannerHeight] = useState<number | null>(null);
  const snapPoints = useMemo<Array<string | number>>(
    () => [bannerHeight ?? BANNER_FALLBACK_HEIGHT, "62%", "94%"],
    [bannerHeight],
  );

  /**
   * The stage owns the height: whenever the parent changes it, the SAME sheet
   * animates to the matching snap point. No sheet is ever mounted or unmounted,
   * so there is no flicker and no stacking.
   */
  useEffect(() => {
    sheetRef.current?.snapToIndex(targetIndex);
    if (effectiveStage === "search") {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    Keyboard.dismiss();
    return undefined;
  }, [effectiveStage, targetIndex]);

  /**
   * Moving the caret to another row starts a NEW search: the text typed for the
   * previous point must not leak into the row that just became active.
   */
  const selectTarget = useCallback(
    (target: RouteTarget) => {
      if (target !== activeTarget) onChangeQuery("");
      onChangeTarget(target);
    },
    [activeTarget, onChangeQuery, onChangeTarget],
  );

  /** Dragging the sheet is just another way of changing stage. */
  const handleChange = useCallback(
    (next: number) => {
      onSnapChange?.(next);
      if (effectiveStage === "idle" && next > 0) onRequestSearch();
      else if (effectiveStage === "search" && next <= 0) onCloseSearch();
    },
    [onCloseSearch, onRequestSearch, onSnapChange, effectiveStage],
  );

  /** Tapping outside the expanded search returns to the collapsed state. */
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={2}
        disappearsOnIndex={1}
        opacity={0.4}
        pressBehavior="none"
        onPress={onCloseSearch}
      />
    ),
    [onCloseSearch],
  );

  const data = useMemo<ListEntry[]>(() => {
    if (searchMode) {
      return suggestions.map((place) => ({
        type: "place" as const,
        id: `s-${place.id}`,
        place,
      }));
    }
    const entries: ListEntry[] = [];
    const push = (label: string, items: PlaceItem[], prefix: string) => {
      if (!items.length) return;
      entries.push({ type: "section", id: `sec-${prefix}`, label });
      items.forEach((place) =>
        entries.push({ type: "place", id: `${prefix}-${place.id}`, place }),
      );
    };
    // Order requested: recent places, then saved / favourite places.
    push(copy.recent, recent, "rec");
    push(copy.favorites, favorites, "fav");
    return entries;
  }, [copy, favorites, recent, searchMode, suggestions]);

  const renderItem = useCallback(
    ({ item }: { item: ListEntry }) => {
      if (item.type === "section") {
        return (
          <Text
            style={[
              styles.sectionLabel,
              { color: surfaces.textMuted, textAlign, writingDirection },
            ]}
          >
            {item.label}
          </Text>
        );
      }
      return (
        <PlaceRow
          surfaces={surfaces}
          title={item.place.title}
          subtitle={item.place.subtitle}
          icon={iconForKind(item.place.kind)}
          onPress={() => {
            Keyboard.dismiss();
            onSelectPlace(item.place);
          }}
        />
      );
    },
    [onSelectPlace, surfaces, textAlign, writingDirection],
  );

  /** Search stage header: the rail, the live field and the two shortcuts. */
  const searchHeader = (
    <View style={styles.block}>
      {/* Close on the reading-exit side (LEFT in Arabic), gold, plus a
          centred uppercase title - the "YOUR ROUTE" header. */}
      <View style={styles.sheetHeader}>
        <Pressable
          onPress={onCloseSearch}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel={tr(messages, "common.close")}
          style={({ pressed }) => [styles.close, pressed && styles.dimmed]}
        >
          <CloseIcon size={iconSize.lg} color={colors.gold} />
        </Pressable>
        <Text
          style={[type("headline", true), styles.sheetTitle, { color: surfaces.text }]}
          numberOfLines={1}
        >
          {copy.title}
        </Text>
        <View style={styles.close} />
      </View>

      {/* No separate search box: the active row itself becomes the input, so
          the user types straight into "your location" or "where to?". */}
      <RouteRows
        surfaces={surfaces}
        pickupLabel={pickupLabel}
        pickupPlaceholder={copy.pickupPlaceholder}
        destinationLabel={destinationLabel}
        destinationPlaceholder={copy.destinationPlaceholder}
        onPressPickup={() => selectTarget("pickup")}
        onPressDestination={() => selectTarget("destination")}
        active={activeTarget}
        onAddStop={onAddStop}
        addStopLabel={copy.addStop}
        stops={stops}
        activeQuery={query}
        onChangeActiveQuery={onChangeQuery}
        activeInputRef={inputRef}
        searching={searching}
      />

      {!searchMode ? (
        <View>
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
      ) : null}
    </View>
  );

  /**
   * Content is keyed by stage: Reanimated cross-fades the old block out and the
   * new one in while the sheet itself animates its height.
   */
  const body =
    effectiveStage === "search" ? (
      <BottomSheetFlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={searchHeader}
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
    ) : isBanner ? (
      /* THE BOTTOM BANNER: full-bleed gold, huge black headline, and a search
         row that is nothing but an icon, a placeholder and one thin black
         underline. Tapping anywhere on it expands the sheet. */
      <BottomSheetView
        style={styles.banner}
        onLayout={(event) => {
          const measured = Math.round(event.nativeEvent.layout.height);
          if (measured > 0 && measured !== bannerHeight) setBannerHeight(measured);
        }}
      >
        <Animated.View
          key="idle"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
        >
          <Pressable
            onPress={onRequestSearch}
            accessibilityRole="button"
            accessibilityLabel={copy.title}
            style={({ pressed }) => [pressed && styles.dimmed]}
          >
            <Text
              style={[
                type("banner", true),
                styles.bannerTitle,
                { color: colors.ink, textAlign, writingDirection },
              ]}
              numberOfLines={2}
            >
              {copy.title}
            </Text>
            <SearchField
              surfaces={BANNER_SURFACES}
              readOnly
              value={destinationLabel}
              placeholder={copy.searchDestination}
              iconColor={colors.ink}
              onPress={onRequestSearch}
            />
          </Pressable>
        </Animated.View>
      </BottomSheetView>
    ) : effectiveStage === "ride" ? (
      /* No vertical scroller here, deliberately. The ride stage contains a
         HORIZONTAL BottomSheetScrollView (the vehicle cards); nesting two
         scrollers of the same gesture system makes the outer one swallow every
         touch and the cards stop moving. A plain view consumes nothing. */
      <BottomSheetView style={styles.stageContent}>
        <Animated.View
          key="ride"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
        >
          {children}
        </Animated.View>
      </BottomSheetView>
    ) : (
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.stageContent}
      >
        <Animated.View
          key={effectiveStage}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
        >
          {children}
        </Animated.View>
      </BottomSheetScrollView>
    );

  return (
    <BottomSheet
      ref={sheetRef}
      index={targetIndex}
      snapPoints={snapPoints}
      onChange={handleChange}
      enableDynamicSizing={false}
      enablePanDownToClose={false}
      enableOverDrag={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      androidKeyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      /* The gold banner is a full-bleed block welded to the bottom of the
         screen: square corners, no drag handle at all. The expanded sheet is
         the opposite: rounded top corners and a visible grabber. */
      backgroundStyle={[
        styles.sheetBackground,
        isBanner
          ? {
              backgroundColor: colors.gold,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }
          : {
              backgroundColor: surfaces.sheet,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
            },
      ]}
      handleIndicatorStyle={
        isBanner
          ? styles.handleHidden
          : [styles.handle, { backgroundColor: surfaces.handle }]
      }
      handleStyle={isBanner ? styles.handleContainerFlat : undefined}
    >
      {body}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  /** Square bottom always; the TOP corners are set per stage on the sheet. */
  sheetBackground: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.xs,
  },
  /** Banner stage: no grabber, and no room reserved for one. */
  handleHidden: { height: 0, opacity: 0 },
  handleContainerFlat: { paddingTop: 0, paddingBottom: 0 },
  block: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  /** Full-bleed gold banner padding: generous, matching the reference. */
  banner: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  bannerTitle: {
    marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  close: {
    width: touchTarget - 14,
    height: touchTarget - 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    flex: 1,
    textAlign: "center",
  },
  dimmed: { opacity: 0.75 },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing["4xl"],
  },
  stageContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["4xl"],
  },
  empty: {
    ...typography.body,
    textAlign: "center",
    paddingVertical: spacing["3xl"],
  },
});

export default React.memo(DestinationSheet);
