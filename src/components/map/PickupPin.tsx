/**
 * PickupPin — flaminGO pickup marker.
 *
 * Small SVG pin, solid GOLD head with a black person glyph, black ring, short
 * gold stem, and the blue origin dot that stays welded to the map point while
 * the pin lifts off / lands.
 *
 * Pure presentational component — no map / snapping logic inside.
 */
import React from "react"
import { PersonIcon } from "../icons/Icons"
import MapPinBase, { PIN_GEOMETRY, type MapPinState } from "./MapPinBase"
import { colors } from "../../design/theme"

export type PickupPinProps = {
	state: MapPinState
	/** Bubble copy (localized). */
	label?: string
	hideBubble?: boolean
	testID?: string
}

const PickupPin: React.FC<PickupPinProps> = ({
	state,
	label = "نقطة الانطلاق",
	hideBubble,
	testID = "pickup-pin",
}) => (
	<MapPinBase
		state={state}
		label={label}
		solid
		hideBubble={hideBubble}
		testID={testID}
		glyph={<PersonIcon size={PIN_GEOMETRY.glyphSize} color={colors.black} />}
	/>
)

export default React.memo(PickupPin)
