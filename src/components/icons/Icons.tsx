/**
 * flaminGO icon set — pure SVG, no PNG assets.
 * Every icon accepts { size, color } and defaults to the design-system sizes.
 */
import React from "react";
import Svg, { Circle, Path, Rect, G } from "react-native-svg";
import { colors, iconSize } from "../../design/theme";

export type IconProps = {
  size?: number;
  color?: string;
};

const base = (size?: number) => size ?? iconSize.md;

export const SearchIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
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
  );
};

/** Person glyph used inside the pickup pin head. */
export const PersonIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.2} r={3.4} fill={color} />
      <Path
        d="M4.8 19.4c0-3.7 3.2-6.2 7.2-6.2s7.2 2.5 7.2 6.2a.9.9 0 0 1-.9.9H5.7a.9.9 0 0 1-.9-.9Z"
        fill={color}
      />
    </Svg>
  );
};

/** Checkered finish flag used inside the dropoff pin head. */
export const FinishFlagIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  const cell = 3;
  const originX = 7.5;
  const originY = 4.5;
  const squares: React.ReactNode[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      if ((row + col) % 2 !== 0) continue;
      squares.push(
        <Rect
          key={`${row}-${col}`}
          x={originX + col * cell}
          y={originY + row * cell}
          width={cell}
          height={cell}
          fill={color}
        />,
      );
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
  );
};

export const CloseIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M6 6 L18 18 M18 6 L6 18"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const TargetIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
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
  );
};

export const MapPinIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
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
  );
};

export const ClockIcon: React.FC<IconProps> = ({
  size,
  color = colors.textSecondary,
}) => {
  const s = base(size);
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
  );
};

export const StarIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="m12 3.4 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.8l6-.9L12 3.4Z"
        fill={color}
      />
    </Svg>
  );
};

export const HomeIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
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
  );
};

/** Gold "+" used to add an intermediate stop next to the pickup row. */
export const PlusIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const MenuIcon: React.FC<IconProps> = ({
  size,
  color = colors.black,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M4 7h16M4 12h16M4 17h10"
        stroke={color}
        strokeWidth={2.3}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const ChevronIcon: React.FC<
  IconProps & { direction?: "left" | "right" }
> = ({ size, color = colors.textSecondary, direction = "right" }) => {
  const s = base(size);
  const d =
    direction === "right"
      ? "M9.5 5.5 16 12l-6.5 6.5"
      : "M14.5 5.5 8 12l6.5 6.5";
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
  );
};

/** Small camera badge pinned to the drawer avatar. */
export const CameraIcon: React.FC<IconProps> = ({
  size,
  color = colors.black,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M3.6 8.4h3.2l1.4-2.2h7.6l1.4 2.2h3.2a.9.9 0 0 1 .9.9v9a.9.9 0 0 1-.9.9H3.6a.9.9 0 0 1-.9-.9v-9a.9.9 0 0 1 .9-.9Z"
        fill={color}
      />
      <Circle cx={12} cy={13.6} r={3.6} fill={colors.gold} />
    </Svg>
  );
};

export const MoonIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M20 14.4A8.4 8.4 0 0 1 9.6 4 8.4 8.4 0 1 0 20 14.4Z"
        fill={color}
      />
    </Svg>
  );
};

export const SunIcon: React.FC<IconProps> = ({ size, color = colors.gold }) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4.4} fill={color} />
      <Path
        d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M19.4 4.6l-1.9 1.9M6.5 17.5l-1.9 1.9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
};

/** Wallet glyph used by the wallet screen header. */
export const WalletIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect
        x={3}
        y={6}
        width={18}
        height={13}
        rx={2.5}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Circle cx={16.6} cy={12.5} r={1.6} fill={color} />
    </Svg>
  );
};

/** QR frame glyph (wallet top-up / send credit). */
export const QrIcon: React.FC<IconProps> = ({ size, color = colors.gold }) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M3.4 8.4V4.9a1.5 1.5 0 0 1 1.5-1.5h3.5M15.6 3.4h3.5a1.5 1.5 0 0 1 1.5 1.5v3.5M20.6 15.6v3.5a1.5 1.5 0 0 1-1.5 1.5h-3.5M8.4 20.6H4.9a1.5 1.5 0 0 1-1.5-1.5v-3.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x={8.6} y={8.6} width={6.8} height={6.8} rx={1.2} fill={color} />
    </Svg>
  );
};

/** Paper-plane glyph (send credit / send a help request). */
export const SendIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M3.2 11.4 20.4 4l-7.4 17.2-2.2-7.6-7.6-2.2Z" fill={color} />
    </Svg>
  );
};

/** Coupon / ticket glyph. */
export const TicketIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M3.4 7.4a1.5 1.5 0 0 1 1.5-1.5h14.2a1.5 1.5 0 0 1 1.5 1.5v2.2a2.4 2.4 0 0 0 0 4.8v2.2a1.5 1.5 0 0 1-1.5 1.5H4.9a1.5 1.5 0 0 1-1.5-1.5v-2.2a2.4 2.4 0 0 0 0-4.8V7.4Z"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/** Life-buoy glyph for the help screen. */
export const HelpIcon: React.FC<IconProps> = ({
  size,
  color = colors.gold,
}) => {
  const s = base(size);
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
        d="M9.4 9.2a2.8 2.8 0 1 1 3.6 3.2c-.7.3-1 .9-1 1.6v.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={12} cy={17.4} r={1.2} fill={color} />
    </Svg>
  );
};

/** Padlock — password fields. */
export const LockIcon: React.FC<IconProps> = ({ size, color = colors.gold }) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect
        x={4.5}
        y={10.5}
        width={15}
        height={10}
        rx={2.4}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={12} cy={15.4} r={1.4} fill={color} />
    </Svg>
  );
};

/** Eye — reveal the password. */
export const EyeIcon: React.FC<IconProps> = ({ size, color = colors.gold }) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M2.6 12S6.4 5.8 12 5.8 21.4 12 21.4 12 17.6 18.2 12 18.2 2.6 12 2.6 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={12} cy={12} r={3.1} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
};

/** Eye with a slash — hide the password. */
export const EyeOffIcon: React.FC<IconProps> = ({ size, color = colors.gold }) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M2.6 12S6.4 5.8 12 5.8 21.4 12 21.4 12 17.6 18.2 12 18.2 2.6 12 2.6 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={12} cy={12} r={3.1} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M4 20 20 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
};

/** Door with an arrow — sign out. */
export const LogoutIcon: React.FC<IconProps> = ({ size, color = colors.danger }) => {
  const s = base(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M14.5 4.5H6.4a1.9 1.9 0 0 0-1.9 1.9v11.2a1.9 1.9 0 0 0 1.9 1.9h8.1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M15.6 8.4 19.2 12l-3.6 3.6M19.2 12h-8.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};
