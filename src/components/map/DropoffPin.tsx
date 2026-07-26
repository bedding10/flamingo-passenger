/**
 * DropoffPin — flaminGO dropoff marker.
 * Same dimensions, same stem, same proportions as PickupPin.
 * Only difference: a checkered finish flag instead of the person glyph.
 */
import React from "react"
import { FinishFlagIcon } from "../icons/Icons"
import MapPinBase, { PIN_GEOMETRY, type MapPinState } from "./MapPinBase"

export type DropoffPinProps = {
	state: MapPinState
	/** Override the bubble copy (localized). Defaults to "Dropoff here". */
	label?: string
	hideBubble?: boolean
	testID?: string
}

const DropoffPin: React.FC<DropoffPinProps> = ({
	state,
	label = "Dropoff here",
	hideBubble,
	testID = "dropoff-pin",
}) => (
	<MapPinBase
		state={state}
		label={label}
		hideBubble={hideBubble}
		testID={testID}
		glyph={<FinishFlagIcon size={PIN_GEOMETRY.glyphSize} />}
	/>
)

export default React.memo(DropoffPin)
