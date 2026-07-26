/**
 * PickupPin — flaminGO pickup marker.
 * Circular head, black center, thin gold border, gold person glyph, long stem.
 * Dragging: detached gold dot, no glow, no bubble.
 * Snapped: gold glow + "Pickup here" bubble.
 *
 * Pure presentational component — no map / snapping logic inside.
 */
import React from "react"
import { PersonIcon } from "../icons/Icons"
import MapPinBase, { PIN_GEOMETRY, type MapPinState } from "./MapPinBase"

export type PickupPinProps = {
	state: MapPinState
	/** Override the bubble copy (localized). Defaults to "Pickup here". */
	label?: string
	hideBubble?: boolean
	testID?: string
}

const PickupPin: React.FC<PickupPinProps> = ({
	state,
	label = "Pickup here",
	hideBubble,
	testID = "pickup-pin",
}) => (
	<MapPinBase
		state={state}
		label={label}
		hideBubble={hideBubble}
		testID={testID}
		glyph={<PersonIcon size={PIN_GEOMETRY.glyphSize} />}
	/>
)

export default React.memo(PickupPin)
