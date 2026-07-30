import React, { useCallback } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Updates from "expo-updates";
import { reportError } from "../core/observability";
import { tr } from "../core/i18n";
import { useMessages } from "../core/use-messages";
import { useSession } from "../core/session-store";
import { useTheme } from "../core/theme-store";

type State = { failed: boolean };
type ErrorFallbackProps = { onRetry: () => void };

function ErrorFallback({ onRetry }: ErrorFallbackProps) {
  const { messages } = useMessages();
  const { palette } = useTheme();

  const restart = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      reportError(error, "app.restart");
      try {
        await useSession.getState().logout();
      } catch {
        // logout() clears the local session in its finally block.
      }
      onRetry();
    }
  }, [onRetry]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.bg }]}>
      <View style={styles.content}>
        <View
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: palette.text }]}>
            {tr(messages, "appError.title")}
          </Text>
          <Text style={[styles.body, { color: palette.textMuted }]}>
            {tr(messages, "appError.body")}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr(messages, "appError.retry")}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.primaryLabel, { color: palette.onPrimary }]}>
              {tr(messages, "appError.retry")}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr(messages, "appError.restart")}
            onPress={() => void restart()}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              { borderColor: palette.border },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.secondaryLabel, { color: palette.text }]}>
              {tr(messages, "appError.restart")}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    reportError(error, "react.render");
  }

  private retry = () => {
    this.setState({ failed: false });
  };

  render() {
    return this.state.failed ? (
      <ErrorFallback onRetry={this.retry} />
    ) : (
      this.props.children
    );
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
  },
  primaryLabel: { fontSize: 16, fontWeight: "800" },
  secondaryLabel: { fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.72 },
});
