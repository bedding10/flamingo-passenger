import type { TextStyle } from "react-native";

// Type scale: bold headings, medium body, generous line heights. Sizes are
// unscaled so the OS font-size setting still applies on top of them.
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
