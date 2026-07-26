import * as Haptics from "expo-haptics";

// Fire-and-forget haptics. Never awaited on a press path, never throws on a
// device without a vibration motor.
export const tapFeedback = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
    () => undefined,
  );
};

export const successFeedback = () => {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
};
