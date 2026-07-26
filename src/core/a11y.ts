import { AccessibilityInfo, type AccessibilityRole } from "react-native";

// Accessibility helpers. Labels always come from the translation bundle, so a
// screen reader speaks Arabic, French or English exactly like the visible UI.

export type A11yProps = {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: { disabled?: boolean; selected?: boolean; busy?: boolean };
};

/** Props for an actionable element (button, card, row). */
export function a11yButton(
  label: string,
  options?: { hint?: string; disabled?: boolean; selected?: boolean; busy?: boolean },
): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: options?.hint,
    accessibilityRole: "button",
    accessibilityState: {
      disabled: options?.disabled,
      selected: options?.selected,
      busy: options?.busy,
    },
  };
}

/** Props for a read-only value: reads "label: value" as one phrase. */
export function a11yValue(label: string, value?: string | number | null): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: value == null || value === "" ? label : label + ": " + String(value),
    accessibilityRole: "text",
  };
}

/** Props for an image that carries meaning (vehicle class, illustration). */
export function a11yImage(label: string): A11yProps {
  return { accessible: true, accessibilityLabel: label, accessibilityRole: "image" };
}

/** Speak a short update (offer received, ride accepted) without stealing focus. */
export function announce(message: string): void {
  if (!message) return;
  AccessibilityInfo.announceForAccessibility(message);
}

/** True when the user asked the OS to reduce motion; skip decorative loops. */
export async function prefersReducedMotion(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}
