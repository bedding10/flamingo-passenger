/**
 * MenuScaffold — the shared shell of the five drawer pages
 * (حسابي / محفظتي / رحلاتي / كوبوناتي / مساعدة).
 *
 * One shell for all of them so the pages feel like a single product: charcoal
 * or white surface driven by the active theme, gold accents, small radii, a
 * flat back chevron and a large page title. Replaces the old generic `Screen`
 * wrapper for these routes.
 *
 * Also exports the premium primitives those pages share (Card, LabeledInput,
 * PrimaryAction, GhostAction, InfoRow, StatusMessage) so no page re-invents a
 * button or an input.
 */
import React from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  colors,
  iconSize,
  radius,
  spacing,
  sheetSurfacesFor,
  touchTarget,
  typography,
  type Surfaces,
} from "../../design/theme"
import { ChevronIcon } from "../icons/Icons"
import { useTextDirection } from "../../core/text-direction"
import { useTheme } from "../../core/theme-store"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"

/**
 * Resolves the surface set used by every drawer page.
 *
 * These pages FOLLOW the app theme, they never invert it: a night map means a
 * night menu. `sheetSurfacesFor` is the non-inverting helper (`surfacesFor`
 * inverts, which is only right for chrome floating on top of the map).
 */
export function useMenuSurfaces(): Surfaces {
  const { name } = useTheme()
  return sheetSurfacesFor(name === "dark" ? "dark" : "light")
}

export type MenuScaffoldProps = {
  title: string
  subtitle?: string
  onBack: () => void
  loading?: boolean
  children: React.ReactNode
}

export const MenuScaffold: React.FC<MenuScaffoldProps> = ({
  title,
  subtitle,
  onBack,
  loading = false,
  children,
}) => {
  const insets = useSafeAreaInsets()
  const { messages } = useMessages()
  const { palette } = useTheme()
  const surfaces = useMenuSurfaces()
  // Words follow the language; the back chevron and every row keep their place.
  const { textAlign, writingDirection } = useTextDirection()

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={onBack}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel={tr(messages, "common.back")}
          style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
        >
          <ChevronIcon
            size={iconSize.lg}
            color={colors.gold}
            direction={"right"}
          />
        </Pressable>
        <Text
          style={[
            styles.title,
            { color: palette.text, textAlign, writingDirection },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              { color: palette.textMuted, textAlign, writingDirection },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + spacing["4xl"] },
            ]}
          >
            {children}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

/** Flat surface block used to group related content. */
export const Card: React.FC<{
  children: React.ReactNode
  centered?: boolean
}> = ({ children, centered }) => {
  const surfaces = useMenuSurfaces()
  const { palette } = useTheme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surfaceAlt,
          borderColor: palette.border,
        },
        centered && styles.cardCentered,
      ]}
    >
      {children}
    </View>
  )
}

export type LabeledInputProps = TextInputProps & {
  label: string
  /** Renders a tall multi-line box (help message). */
  area?: boolean
}

export const LabeledInput: React.FC<LabeledInputProps> = ({
  label,
  area = false,
  style,
  ...rest
}) => {
  const { palette } = useTheme()
  const { textAlign, writingDirection } = useTextDirection()
  return (
    <View style={styles.fieldBlock}>
      <Text
        style={[
          styles.fieldLabel,
          { color: palette.textMuted, textAlign, writingDirection },
        ]}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={palette.textMuted}
        multiline={area}
        textAlignVertical={area ? "top" : "center"}
        style={[
          styles.input,
          area && styles.textArea,
          {
            color: palette.text,
            backgroundColor: palette.surfaceAlt,
            borderColor: palette.border,
            textAlign,
            writingDirection,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  )
}

export const PrimaryAction: React.FC<{
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  leading?: React.ReactNode
}> = ({ label, onPress, disabled, loading, leading }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
    android_ripple={{ color: "rgba(0,0,0,0.12)" }}
    style={({ pressed }) => [
      styles.primary,
      (disabled || loading) && styles.disabled,
      pressed && styles.dimmed,
    ]}
  >
    {loading ? (
      <ActivityIndicator color={colors.black} />
    ) : (
      <>
        {leading}
        <Text style={styles.primaryLabel}>{label}</Text>
      </>
    )}
  </Pressable>
)

export const GhostAction: React.FC<{
  label: string
  onPress: () => void
  leading?: React.ReactNode
  disabled?: boolean
}> = ({ label, onPress, leading, disabled }) => {
  const { palette } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      android_ripple={{ color: colors.pressed }}
      style={({ pressed }) => [
        styles.ghost,
        { borderColor: colors.gold },
        disabled && styles.disabled,
        pressed && styles.dimmed,
      ]}
    >
      {leading}
      <Text style={[styles.ghostLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  )
}

export const InfoRow: React.FC<{
  title: string
  subtitle?: string
  value?: string
  onPress?: () => void
}> = ({ title, subtitle, value, onPress }) => {
  const { palette } = useTheme()
  const { textAlign, writingDirection } = useTextDirection()
  const body = (
    <View style={styles.infoRow}>
      <View style={styles.flex}>
        <Text
          style={[
            styles.infoTitle,
            { color: palette.text, textAlign, writingDirection },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.infoSubtitle,
              { color: palette.textMuted, textAlign, writingDirection },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.infoValue, { color: colors.gold }]}>{value}</Text>
      ) : null}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: colors.pressed }}
      style={({ pressed }) => [pressed && styles.dimmed]}
    >
      {body}
    </Pressable>
  )
}

export const StatusMessage: React.FC<{
  children: React.ReactNode
  danger?: boolean
}> = ({ children, danger }) => {
  const { textAlign, writingDirection } = useTextDirection()
  return (
    <View
      style={[
        styles.status,
        {
          borderColor: danger ? colors.danger : colors.gold,
          backgroundColor: danger
            ? "rgba(229,72,77,0.10)"
            : "rgba(217,165,32,0.10)",
        },
      ]}
    >
      <Text
        style={[
          styles.statusText,
          {
            color: danger ? colors.danger : colors.gold,
            textAlign,
            writingDirection,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  )
}

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { palette } = useTheme()
  const { textAlign, writingDirection } = useTextDirection()
  return (
    <Text
      style={[
        styles.section,
        { color: palette.textMuted, textAlign, writingDirection },
      ]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  dimmed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  back: {
    width: touchTarget - 14,
    height: touchTarget - 14,
    alignItems: "flex-end",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  title: {
    ...typography.display,
  },
  subtitle: {
    ...typography.body,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardCentered: { alignItems: "center" },
  fieldBlock: { gap: spacing.xs },
  fieldLabel: {
    ...typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    minHeight: touchTarget,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    ...typography.subtitle,
  },
  textArea: {
    minHeight: 160,
    paddingTop: spacing.md,
  },
  primary: {
    minHeight: touchTarget,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: {
    ...typography.subtitle,
    fontWeight: "800",
    color: colors.black,
  },
  ghost: {
    minHeight: touchTarget,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  ghostLabel: {
    ...typography.subtitle,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoTitle: {
    ...typography.body,
    fontWeight: "600",
  },
  infoSubtitle: {
    ...typography.caption,
  },
  infoValue: {
    ...typography.subtitle,
    fontWeight: "800",
  },
  status: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  statusText: {
    ...typography.body,
    fontWeight: "600",
  },
  section: {
    ...typography.caption,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
})

export default MenuScaffold

/* -------------------------------------------------------------------------- */
/* Underline primitives                                                       */
/*                                                                            */
/* The account, password and coupon pages ask for the same quiet field: a     */
/* leading icon, the value, an optional trailing control, and a single hair-  */
/* line underneath — no boxes, no cards.                                      */
/* -------------------------------------------------------------------------- */

export type UnderlineFieldProps = TextInputProps & {
  /** Icon drawn on the leading side of the line. */
  leading?: React.ReactNode
  /** Optional control on the trailing side (the eye toggle, a chevron…). */
  trailing?: React.ReactNode
}

export const UnderlineField: React.FC<UnderlineFieldProps> = ({
  leading,
  trailing,
  style,
  editable,
  ...rest
}) => {
  const { palette } = useTheme()
  const { textAlign, writingDirection } = useTextDirection()
  return (
    <View style={[line.row, { borderBottomColor: palette.border }]}>
      {leading ? <View style={line.slot}>{leading}</View> : null}
      <TextInput
        placeholderTextColor={palette.textMuted}
        editable={editable}
        style={[
          line.input,
          {
            color: editable === false ? palette.textMuted : palette.text,
            textAlign,
            writingDirection,
          },
          style,
        ]}
        {...rest}
      />
      {trailing ? <View style={line.slot}>{trailing}</View> : null}
    </View>
  )
}

/** Same hairline, but for read-only composed content (the phone row). */
export const UnderlineRow: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { palette } = useTheme()
  return (
    <View style={[line.row, { borderBottomColor: palette.border }]}>
      {children}
    </View>
  )
}

/** Quiet text button (إدارة كلمة المرور / تسجيل الخروج). */
export const LinkAction: React.FC<{
  label: string
  onPress: () => void
  leading?: React.ReactNode
  color?: string
}> = ({ label, onPress, leading, color = colors.gold }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    android_ripple={{ color: colors.pressed }}
    style={({ pressed }) => [line.link, pressed && styles.dimmed]}
  >
    {leading}
    <Text style={[line.linkLabel, { color }]}>{label}</Text>
  </Pressable>
)

const line = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: touchTarget,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slot: { alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    ...typography.subtitle,
  },
  link: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: touchTarget - 8,
  },
  linkLabel: {
    ...typography.subtitle,
    fontWeight: "800",
  },
})
