import type { TextStyle } from "react-native";

// Type scale of the component layer.
//
// The root type scale lives in `src/design/theme.ts` (`typography`) and is used
// by the map, the sheet and the drawer. The tokens below are the component-tree
// scale; they are intentionally separate because their sizes differ, and
// aligning them would change the visual design.
// Sizes are unscaled so the OS font-size setting still applies on top.
export const TYPE = {
  display: { fontSize: 34, fontWeight: "900", letterSpacing: -0.6, lineHeight: 40 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3, lineHeight: 30 },
  heading: { fontSize: 19, fontWeight: "800", lineHeight: 25 },
  body: { fontSize: 16, fontWeight: "500", lineHeight: 23 },
  bodyStrong: { fontSize: 16, fontWeight: "700", lineHeight: 23 },
  caption: { fontSize: 13, fontWeight: "500", lineHeight: 19 },
  overline: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof TYPE;
