/**
 * flaminGO icon set — pure SVG, no PNG assets.
 * Every icon accepts { size, color } and defaults to the design-system sizes.
 */
import React from "react"
import Svg, { Circle, Path, Rect, G } from "react-native-svg"
import { colors, iconSize } from "../../design/theme"

export type IconProps = {
	size?: number
	color?: string
}

const base = (size?: number) => size ?? iconSize.md

export const SearchIcon: React.FC<IconProps> = ({
	size,
	color = colors.gold,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Circle
				cx={10.5}
				cy={10.5}
				r={6.5}
				stroke={color}
				strokeWidth={2.2}
				fill="none"
			/>
			<Path
				d="M15.5 15.5 L20.5 20.5"
				stroke={color}
				strokeWidth={2.2}
				strokeLinecap="round"
			/>
		</Svg>
	)
}

/** Person glyph used inside the pickup pin head. */
export const PersonIcon: React.FC<IconProps> = ({
	size,
	color = colors.gold,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Circle cx={12} cy={8.2} r={3.4} fill={color} />
			<Path
				d="M4.8 19.4c0-3.7 3.2-6.2 7.2-6.2s7.2 2.5 7.2 6.2a.9.9 0 0 1-.9.9H5.7a.9.9 0 0 1-.9-.9Z"
				fill={color}
			/>
		</Svg>
	)
}

/** Checkered finish flag used inside the dropoff pin head. */
export const FinishFlagIcon: React.FC<IconProps> = ({
	size,
	color = colors.gold,
}) => {
	const s = base(size)
	const cell = 3
	const originX = 7.5
	const originY = 4.5
	const squares: React.ReactNode[] = []
	for (let row = 0; row < 3; row += 1) {
		for (let col = 0; col < 3; col += 1) {
			if ((row + col) % 2 !== 0) continue
			squares.push(
				<Rect
					key={`${row}-${col}`}
					x={originX + col * cell}
					y={originY + row * cell}
					width={cell}
					height={cell}
					fill={color}
				/>,
			)
		}
	}
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Path
				d={`M5.6 3.6 V20.4`}
				stroke={color}
				strokeWidth={1.9}
				strokeLinecap="round"
			/>
			<Rect
				x={originX - 0.9}
				y={originY - 0.9}
				width={cell * 3 + 1.8}
				height={cell * 3 + 1.8}
				rx={1}
				stroke={color}
				strokeWidth={1.3}
				fill="none"
			/>
			<G>{squares}</G>
		</Svg>
	)
}

export const CloseIcon: React.FC<IconProps> = ({
	size,
	color = colors.gold,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Path
				d="M6 6 L18 18 M18 6 L6 18"
				stroke={color}
				strokeWidth={2.4}
				strokeLinecap="round"
			/>
		</Svg>
	)
}

export const TargetIcon: React.FC<IconProps> = ({
	size,
	color = colors.gold,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Circle
				cx={12}
				cy={12}
				r={7}
				stroke={color}
				strokeWidth={2}
				fill="none"
			/>
			<Circle cx={12} cy={12} r={2.4} fill={color} />
			<Path
				d="M12 1.8v3.2M12 19v3.2M1.8 12h3.2M19 12h3.2"
				stroke={color}
				strokeWidth={2}
				strokeLinecap="round"
			/>
		</Svg>
	)
}

export const MapPinIcon: React.FC<IconProps> = ({
	size,
	color = colors.gold,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Path
				d="M12 2.6c-3.9 0-7 3-7 6.8 0 4.9 5.6 10.5 6.4 11.3a.9.9 0 0 0 1.2 0C13.4 19.9 19 14.3 19 9.4c0-3.8-3.1-6.8-7-6.8Z"
				stroke={color}
				strokeWidth={2}
				fill="none"
			/>
			<Circle cx={12} cy={9.3} r={2.5} fill={color} />
		</Svg>
	)
}

export const ClockIcon: React.FC<IconProps> = ({
	size,
	color = colors.textSecondary,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Circle
				cx={12}
				cy={12}
				r={9}
				stroke={color}
				strokeWidth={2}
				fill="none"
			/>
			<Path
				d="M12 7.2V12l3.4 2.2"
				stroke={color}
				strokeWidth={2}
				strokeLinecap="round"
			/>
		</Svg>
	)
}

export const StarIcon: React.FC<IconProps> = ({
	size,
	color = colors.gold,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Path
				d="m12 3.4 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.8l6-.9L12 3.4Z"
				fill={color}
			/>
		</Svg>
	)
}

export const HomeIcon: React.FC<IconProps> = ({
	size,
	color = colors.gold,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Path
				d="M4 10.6 12 4l8 6.6V20a.9.9 0 0 1-.9.9h-4.4v-6h-5.4v6H4.9A.9.9 0 0 1 4 20v-9.4Z"
				stroke={color}
				strokeWidth={2}
				fill="none"
				strokeLinejoin="round"
			/>
		</Svg>
	)
}

export const MenuIcon: React.FC<IconProps> = ({
	size,
	color = colors.black,
}) => {
	const s = base(size)
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Path
				d="M4 7h16M4 12h16M4 17h10"
				stroke={color}
				strokeWidth={2.3}
				strokeLinecap="round"
			/>
		</Svg>
	)
}

export const ChevronIcon: React.FC<
	IconProps & { direction?: "left" | "right" }
> = ({ size, color = colors.textSecondary, direction = "right" }) => {
	const s = base(size)
	const d =
		direction === "right" ? "M9.5 5.5 16 12l-6.5 6.5" : "M14.5 5.5 8 12l6.5 6.5"
	return (
		<Svg width={s} height={s} viewBox="0 0 24 24">
			<Path
				d={d}
				stroke={color}
				strokeWidth={2.2}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</Svg>
	)
}
