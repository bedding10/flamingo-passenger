/** flaminGO UI barrel — single import surface for screens. */
export {
	default as theme,
	colors,
	radius,
	spacing,
	iconSize,
	touchTarget,
	typography,
	shadows,
	motion,
} from "../design/theme"
export type { Theme } from "../design/theme"

export { default as PickupPin } from "./map/PickupPin"
export type { PickupPinProps } from "./map/PickupPin"
export { default as DropoffPin } from "./map/DropoffPin"
export type { DropoffPinProps } from "./map/DropoffPin"
export {
	default as MapPinBase,
	PIN_GEOMETRY,
	PIN_WIDTH,
	PIN_HEIGHT,
} from "./map/MapPinBase"
export type { MapPinState, MapPinBaseProps } from "./map/MapPinBase"
export { default as PinSpeechBubble } from "./map/PinSpeechBubble"

export {
	default as DestinationSheet,
	defaultCopyAr,
} from "./destination/DestinationSheet"
export type {
	DestinationSheetProps,
	DestinationSheetCopy,
	PlaceItem,
	PlaceKind,
} from "./destination/DestinationSheet"
export { default as SearchField } from "./destination/SearchField"
export { default as PlaceRow } from "./destination/PlaceRow"
export { default as RouteRows } from "./destination/RouteRows"

export { default as SideDrawer } from "./drawer/SideDrawer"
export type { SideDrawerProps, DrawerMenuKey } from "./drawer/SideDrawer"

export * from "./icons/Icons"
