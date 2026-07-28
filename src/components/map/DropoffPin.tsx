/**
 * DropoffPin — flaminGO destination marker.
 *
 * Same geometry and same choreography as PickupPin. The only differences are
 * the inverted head (charcoal fill, gold ring) and the checkered finish flag.
 */
import React from "react"
import { FinishFlagIcon } from "../icons/Icons"
import MapPinBase, { PIN_GEOMETRY, type MapPinState } from "./MapPinBase"
import { colors } from "../../design/theme"

export type DropoffPinProps = {
	state: MapPinState
	/** Bubble copy (localized). */
	label?: string
	hideBubble?: boolean
	testID?: string
}

const DropoffPin: React.FC<DropoffPinProps> = ({
	state,
	label = "الوجهة",
	hideBubble,
	testID = "dropoff-pin",
}) => (
	<MapPinBase
		state={state}
		label={label}
		solid={false}
		hideBubble={hideBubble}
		testID={testID}
		glyph={<FinishFlagIcon size={PIN_GEOMETRY.glyphSize} color={colors.gold} />}
	/>
)

export default React.memo(DropoffPin)
