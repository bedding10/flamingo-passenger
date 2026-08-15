/**
 * SideDrawer — flaminGO side menu, rebuilt from scratch.
 *
 * Heetch feel, flaminGO identity (charcoal / white / gold). It wears the SAME
 * skin as the map: night map -> night drawer, day map -> day drawer.
 *
 * Layout, top to bottom:
 *   • Profile card
 *       – avatar photo, or a circular gold avatar with the first letter of the
 *         name (Google style) when there is no photo
 *         (display only — the photo is changed from the account screen)
 *       – "محمد (125)"       — name, then the trip count alone, smaller
 *       – ★★★☆☆ 4.5 / 5      — five real stars, halves included
 *   • Exactly five items: حسابي / محفظتي / رحلاتي / كوبوناتي / مساعدة
 *   • Bottom bar: language flags (🇩🇿 🇫🇷 🇬🇧) then the Light/Dark toggle
 *
 * PURE UI: every action is a callback, so navigation, the profile API and the
 * theme store stay exactly where they already are.
 */
import React, { useCallback, useEffect, useMemo } from "react"
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  colors,
  iconSize,
  motion,
  radius,
  spacing,
  sheetSurfacesFor,
  touchTarget,
  typography,
} from "../../design/theme"
import { CloseIcon, MoonIcon, SunIcon } from "../icons/Icons"
import StarRating from "../StarRating"
import { tr } from "../../core/i18n"
import { useTextDirection } from "../../core/text-direction"
import { useLatinType } from "../../core/typeface"
import { useMessages } from "../../core/use-messages"

export type DrawerMenuKey =
  | "account"
  | "wallet"
  | "trips"
  | "coupons"
  | "help"

export type DrawerLocale = "ar" | "fr" | "en"

/** Only these five, in this order. Nothing else is ever rendered. */
const MENU_ORDER: DrawerMenuKey[] = [
  "account",
  "wallet",
  "trips",
  "coupons",
  "help",
]

const LABEL_KEYS: Record<DrawerMenuKey, string> = {
  account: "drawer.account",
  wallet: "drawer.wallet",
  trips: "drawer.trips",
  coupons: "drawer.coupons",
  help: "drawer.help",
}

const FLAGS: Array<{ locale: DrawerLocale; flag: string }> = [
  { locale: "ar", flag: "\uD83C\uDDE9\uD83C\uDDFF" },
  { locale: "fr", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { locale: "en", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
]

export type SideDrawerProps = {
  visible: boolean
  onClose: () => void
  /** Theme the MAP is drawn with — the drawer inverts it. */
  mapTheme: "light" | "dark"
  userName: string
  avatarUrl?: string | null
  /** Phase 11 - level frame URL, produced by the backend. Never built here. */
  frameUrl?: string | null
  /** Completed trips, shown in parentheses next to the name. */
  tripCount?: number | null
  /** Average rating from the server, e.g. 4.96. */
  rating?: number | null
  activeLocale?: DrawerLocale
  onSelect: (key: DrawerMenuKey) => void
  onChangeLocale: (locale: DrawerLocale) => void
  onToggleTheme: () => void
  /** Optional localized labels. */
  labels?: Partial<Record<DrawerMenuKey, string>>
}

const AVATAR = 72

const SideDrawer: React.FC<SideDrawerProps> = ({
  visible,
  onClose,
  mapTheme,
  userName,
  avatarUrl,
  frameUrl,
  tripCount,
  rating,
  activeLocale = "ar",
  onSelect,
  onChangeLocale,
  onToggleTheme,
  labels,
}) => {
  const { width } = useWindowDimensions()
  const { messages } = useMessages()
  const type = useLatinType()
  // Text alignment follows the LANGUAGE; the drawer itself never moves.
  const { textAlign, writingDirection } = useTextDirection()
  const insets = useSafeAreaInsets()
  const drawerWidth = Math.round(Math.min(width * 0.82, 340))
  // The drawer lives on the right edge in EVERY language and hides toward the
  // right. This is structure, not text: it does not follow the locale, and it
  // never reads a system flag.
  const hiddenOffset = drawerWidth
  // The drawer wears the SAME skin as the map: dark map -> dark drawer.
  const surfaces = useMemo(() => sheetSurfacesFor(mapTheme), [mapTheme])
  const menu = useMemo(
    () => Object.fromEntries(
      MENU_ORDER.map((key) => [key, labels?.[key] ?? tr(messages, LABEL_KEYS[key])]),
    ) as Record<DrawerMenuKey, string>,
    [labels, messages],
  )
  /** 0 = closed, 1 = fully open. Drives the slide and the backdrop together. */
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = visible
      ? withSpring(1, motion.spring)
      : withTiming(0, {
          duration: motion.base,
          easing: Easing.out(Easing.cubic),
        })
  }, [visible, progress])

  useEffect(() => {
    if (!visible) return undefined
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  const close = useCallback(() => onClose(), [onClose])

  /** Swipe toward the outer edge to dismiss. */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-9999, 12])
        .onUpdate((event) => {
          const raw = event.translationX
          progress.value = Math.max(0, 1 - Math.max(0, raw) / drawerWidth)
        })
        .onEnd((event) => {
          const velocity = event.velocityX
          if (progress.value < 0.6 || velocity > 700) {
            progress.value = withTiming(
              0,
              { duration: motion.fast, easing: Easing.out(Easing.cubic) },
              () => runOnJS(close)(),
            )
          } else {
            progress.value = withSpring(1, motion.spring)
          }
        }),
    [close, drawerWidth, progress],
  )

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [hiddenOffset, 0]) },
    ],
  }))

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }))

  if (!visible) return null

  const initial = userName?.trim()?.charAt(0)?.toUpperCase() || "F"

  // Every passenger STARTS at five stars and only goes down as drivers rate
  // them, so a missing / zero score from the server means "not rated yet" and
  // must read as 5, never as 0.0.
  const serverRating = Number(rating)
  const displayRating =
    Number.isFinite(serverRating) && serverRating > 0 ? serverRating : 5
  // Whole scores print bare ("5"), partial ones keep one decimal ("4.6").
  const ratingLabel = Number.isInteger(displayRating)
    ? String(displayRating)
    : displayRating.toFixed(1)

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={tr(messages, "drawer.closeMenu")}
        />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.panel,
            styles.panelEnd,
            {
              width: drawerWidth,
              backgroundColor: surfaces.sheet,
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.lg,
            },
            panelStyle,
          ]}
        >
          {/* Gold X — no circle, no shadow */}
          <Pressable
            onPress={close}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel={tr(messages, "common.close")}
            style={({ pressed }) => [
              styles.close,
              pressed && styles.dimmed,
            ]}
          >
            <CloseIcon size={iconSize.lg} color={colors.gold} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* ── Profile card ────────────────────────────────────── */}
            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: surfaces.field,
                  borderColor: surfaces.divider,
                },
              ]}
            >
              <View style={styles.avatarWrap}>
                <ProfileAvatar
                  avatarUrl={avatarUrl}
                  frameUrl={frameUrl}
                  size={AVATAR}
                  fallback={initial}
                />
              </View>

              {/* Name and trip count are two separate Texts so the count can be
                  smaller and quieter than the name. The word "trip" is gone:
                  the bare number in parentheses reads better and never wraps. */}
              <View style={styles.nameRow}>
                <Text
                  style={[styles.name, { color: surfaces.text, writingDirection }]}
                  numberOfLines={1}
                >
                  {userName}
                </Text>
                {tripCount != null ? (
                  <Text style={[styles.tripCount, { color: surfaces.textMuted }]}>
                    {` (${tripCount})`}
                  </Text>
                ) : null}
              </View>

              <View style={styles.ratingRow}>
                <StarRating rating={displayRating} size={14} />
                <Text style={[styles.rating, { color: surfaces.textMuted }]}>
                  {ratingLabel}
                </Text>
              </View>
            </View>

            {/* ── Exactly five items ───────────────────────────────── */}
            <View style={styles.menu}>
              {MENU_ORDER.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    onSelect(key)
                    close()
                  }}
                  android_ripple={{ color: colors.pressed }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && { backgroundColor: surfaces.fieldPressed },
                  ]}
                >
                  <Text
                    style={[
                      type("menuItem", true),
                      styles.menuLabel,
                      { color: surfaces.text, textAlign, writingDirection },
                    ]}
                    numberOfLines={1}
                  >
                    {menu[key]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* ── Bottom bar: language flags, then the theme toggle ──────── */}
          <View
            style={[styles.bottomBar, { borderTopColor: surfaces.divider }]}
          >
            <View style={styles.flags}>
              {FLAGS.map(({ locale, flag }) => {
                const active = locale === activeLocale
                return (
                  <Pressable
                    key={locale}
                    onPress={() => onChangeLocale(locale)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={tr(messages, `language.${locale}`)}
                    style={({ pressed }) => [
                      styles.flagButton,
                      { borderColor: surfaces.divider },
                      active && styles.flagActive,
                      pressed && styles.dimmed,
                    ]}
                  >
                    <Text style={styles.flag}>{flag}</Text>
                    {/* The language NAME sits next to its flag: emoji flags are
                        unreadable at this size on many Android builds. */}
                    <Text
                      style={[
                        styles.flagLabel,
                        { color: active ? colors.gold : surfaces.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {tr(messages, `language.${locale}`)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Pressable
              onPress={onToggleTheme}
              accessibilityRole="button"
              accessibilityLabel={tr(messages, "drawer.changeTheme")}
              style={({ pressed }) => [
                styles.themeButton,
                {
                  backgroundColor: surfaces.field,
                  borderColor: surfaces.divider,
                },
                pressed && styles.dimmed,
              ]}
            >
              {mapTheme === "light" ? (
                <MoonIcon size={iconSize.sm} color={colors.gold} />
              ) : (
                <SunIcon size={iconSize.sm} color={colors.gold} />
              )}
              <Text style={[styles.themeLabel, { color: colors.gold }]}>
                {tr(messages, mapTheme === "light" ? "theme.dark" : "theme.light")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
  },
  panelEnd: { right: 0 },
  close: {
    width: touchTarget - 14,
    height: touchTarget - 14,
    alignItems: "flex-end",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  dimmed: { opacity: 0.6 },
  scroll: {
    paddingBottom: spacing.xl,
  },
  profileCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing["2xl"],
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    marginBottom: spacing.md,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: {
    ...typography.display,
    fontSize: 30,
    color: colors.ink,
  },
  nameRow: {
    // Fixed structure (see addendum 4, item 2): it does not follow the locale.
    flexDirection: "row-reverse",
    alignItems: "baseline",
    flexShrink: 1,
    maxWidth: "100%",
  },
  name: {
    ...typography.title,
    flexShrink: 1,
  },
  tripCount: {
    ...typography.caption,
    marginStart: 4,
  },
  ratingRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rating: {
    ...typography.caption,
    fontWeight: "700",
  },
  /* Few, large, generously spaced items. No decorative icons. */
  menu: {
    gap: spacing.lg,
  },
  menuItem: {
    minHeight: touchTarget + spacing.md,
    justifyContent: "center",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  // Alignment is passed inline from useTextDirection(): it follows the
  // language, unlike the row itself.
  menuLabel: {},
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  flags: {
    gap: spacing.xs,
  },
  /* One full-width row per language: flag, then its name. */
  flagButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flagActive: {
    borderColor: colors.gold,
    backgroundColor: colors.pressed,
  },
  flag: { fontSize: 18 },
  flagLabel: {
    ...typography.body,
    flex: 1,
    textAlign: "right",
  },
  /* Secondary CTA: still a pill, per the CTA rule. */
  themeButton: {
    height: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  themeLabel: {
    ...typography.body,
    fontWeight: "700",
  },
})

export default React.memo(SideDrawer)
