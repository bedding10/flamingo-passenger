/**
 * RouteRows - the pickup / stops / destination rail of the single sheet.
 *
 *   (person)  Choose your pickup           [ + ]
 *      |
 *   ( 1 )     Add a stop                   [ - ]
 *      |
 *   (flag)    Where to?
 *
 * Reference parity: a WHITE circle with a head for the pickup, a GOLD circle
 * carrying the stop number for every intermediate stop, and a chequered flag
 * for the final destination, all joined by one thin vertical connector.
 *
 * Bare by design: NO card, NO fill, NO border - the rail is part of the sheet
 * itself. Tapping a row only tells the sheet which point is being edited.
 * The rail STRUCTURE is hard-wired (indicator column always on the right);
 * only the text alignment follows the selected language, via
 * useTextDirection().
 */
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import {
  colors,
  iconSize,
  radius,
  spacing,
  typography,
  type Surfaces,
} from "../../design/theme";
import { FinishFlagIcon, PersonIcon, PlusIcon } from "../icons/Icons";
import { useTextDirection } from "../../core/text-direction";

export type RouteTarget = "pickup" | "destination";

export type RouteStop = {
  key: string;
  label: string;
  onPress: () => void;
  /** Renders the gold-ringed "-" control that removes this stop. */
  onRemove?: () => void;
  removeLabel?: string;
};

export type RouteRowsProps = {
  surfaces: Surfaces;
  pickupLabel: string;
  pickupPlaceholder: string;
  destinationLabel: string;
  destinationPlaceholder: string;
  onPressPickup: () => void;
  onPressDestination: () => void;
  /** Which row is currently being edited - gets the gold focus treatment. */
  active?: RouteTarget;
  /** Gold "+" next to the pickup row. Omitted at the stop limit. */
  onAddStop?: () => void;
  addStopLabel?: string;
  /** Intermediate stops, rendered between pickup and destination. */
  stops?: RouteStop[];
  /**
   * Typing happens INSIDE the active row, not in a separate box underneath it:
   * the row that matches `active` swaps its label for a real text input.
   */
  activeQuery?: string;
  onChangeActiveQuery?: (text: string) => void;
  activeInputRef?: React.Ref<TextInput>;
  /** Shows a spinner at the end of the active row while results load. */
  searching?: boolean;
};

const ROW_HEIGHT = 52;
const MARKER = 28;
const CONTROL = 30;

/** White disc + head: "this is you". */
const PickupMarker: React.FC = () => (
  <View style={[styles.marker, styles.markerPickup]}>
    <PersonIcon size={16} color={colors.ink} />
  </View>
);

/** Gold disc carrying the stop number. */
const StopMarker: React.FC<{ index: number }> = ({ index }) => (
  <View style={[styles.marker, styles.markerStop]}>
    <Text style={styles.markerNumber}>{index}</Text>
  </View>
);

/** Chequered flag: the final destination. */
const DestinationMarker: React.FC = () => (
  <View style={[styles.marker, styles.markerDestination]}>
    <FinishFlagIcon size={16} color={colors.ink} />
  </View>
);

const RouteRows: React.FC<RouteRowsProps> = ({
  surfaces,
  pickupLabel,
  pickupPlaceholder,
  destinationLabel,
  destinationPlaceholder,
  onPressPickup,
  onPressDestination,
  active,
  onAddStop,
  addStopLabel,
  stops = [],
  activeQuery = "",
  onChangeActiveQuery,
  activeInputRef,
  searching = false,
}) => {
  // Words re-align with the language; the rail, the markers and the row
  // direction are structure and never move (addendum 4, items 2 and 3).
  const { textAlign, writingDirection } = useTextDirection();

  /** One row = marker column (with its connector) + value + optional control. */
  const renderRow = (
    marker: React.ReactNode,
    value: string,
    placeholder: string,
    onPress: () => void,
    options: {
      last?: boolean;
      focused?: boolean;
      /** The focused row becomes an editable field instead of a label. */
      editable?: boolean;
      control?: React.ReactNode;
    } = {},
  ) => (
    <View style={styles.rowLine}>
      <View style={styles.railColumn}>
        {marker}
        {options.last ? null : (
          <View
            style={[styles.connector, { backgroundColor: surfaces.divider }]}
          />
        )}
      </View>

      {options.editable ? (
        /* The row IS the search box. BottomSheetTextInput (not the plain one)
           because any interactive input living inside the sheet otherwise
           loses its touches to the sheet's gesture handler. */
        <View style={[styles.row, styles.rowActive, styles.rowEditing]}>
          <BottomSheetTextInput
            ref={activeInputRef as never}
            value={activeQuery}
            onChangeText={onChangeActiveQuery}
            placeholder={placeholder}
            placeholderTextColor={surfaces.textMuted}
            style={[
              styles.value,
              styles.input,
              { color: surfaces.text, textAlign, writingDirection },
            ]}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={onPress}
          android_ripple={{ color: colors.pressed }}
          style={({ pressed }) => [
            styles.row,
            (pressed || options.focused) && styles.rowActive,
          ]}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.value,
              {
                color: value ? surfaces.text : surfaces.textMuted,
                textAlign,
                writingDirection,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value || placeholder}
          </Text>
        </Pressable>
      )}

      {options.control ?? null}
    </View>
  );

  return (
    <View style={styles.root}>
      {renderRow(
        <PickupMarker />,
        pickupLabel,
        pickupPlaceholder,
        onPressPickup,
        {
          focused: active === "pickup",
          editable: active === "pickup" && !!onChangeActiveQuery,
          control: onAddStop ? (
            <Pressable
              onPress={onAddStop}
              accessibilityRole="button"
              accessibilityLabel={addStopLabel}
              android_ripple={{ color: colors.pressed, borderless: true }}
              style={({ pressed }) => [
                styles.control,
                styles.controlAdd,
                pressed && styles.dimmed,
              ]}
            >
              <PlusIcon size={iconSize.sm} color={colors.ink} />
            </Pressable>
          ) : null,
        },
      )}

      {stops.map((stop, index) =>
        renderRow(
          <StopMarker index={index + 1} />,
          stop.label,
          "",
          stop.onPress,
          {
            control: stop.onRemove ? (
              <Pressable
                onPress={stop.onRemove}
                accessibilityRole="button"
                accessibilityLabel={stop.removeLabel}
                android_ripple={{ color: colors.pressed, borderless: true }}
                style={({ pressed }) => [
                  styles.control,
                  styles.controlRemove,
                  pressed && styles.dimmed,
                ]}
              >
                <View style={styles.minus} />
              </Pressable>
            ) : null,
          },
        ),
      )}

      {renderRow(
        <DestinationMarker />,
        destinationLabel,
        destinationPlaceholder,
        onPressDestination,
        {
          last: true,
          focused: active === "destination",
          editable: active === "destination" && !!onChangeActiveQuery,
        },
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /* No background, no border, no radius: part of the sheet, not a card. */
  root: {
    alignSelf: "stretch",
  },
  rowLine: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    gap: spacing.md,
  },
  railColumn: {
    width: MARKER,
    alignItems: "center",
    paddingTop: (ROW_HEIGHT - MARKER) / 2,
  },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  markerPickup: {
    backgroundColor: colors.white,
  },
  markerStop: {
    backgroundColor: colors.gold,
  },
  markerDestination: {
    backgroundColor: colors.white,
  },
  markerNumber: {
    ...typography.caption,
    fontWeight: "800",
    color: colors.ink,
  },
  /* The thin line that ties the whole route together. */
  connector: {
    flex: 1,
    minHeight: 12,
    width: 1.5,
    marginVertical: spacing.xs,
  },
  row: {
    flex: 1,
    minHeight: ROW_HEIGHT,
    justifyContent: "center",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  rowActive: {
    backgroundColor: colors.pressed,
  },
  /* Editing state: the value and the spinner share the row. */
  rowEditing: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    padding: 0,
  },
  value: {
    ...typography.subtitle,
  },
  /* Circular "+" / "-" controls, both pills. */
  control: {
    width: CONTROL,
    height: CONTROL,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  controlAdd: {
    backgroundColor: colors.gold,
  },
  controlRemove: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  minus: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gold,
  },
  dimmed: { opacity: 0.75 },
});

export default React.memo(RouteRows);
