/**
 * كلمة المرور — one job, one page.
 *
 * Two hairline fields (current, new), each with a padlock and an eye toggle,
 * then Save. No rule text on screen: the backend is the authority, and its
 * refusal is what the passenger sees. The contract is unchanged
 * (POST /auth/password/change via `changePassword`).
 */
import React, { useState } from "react"
import { Alert, Pressable, StyleSheet } from "react-native"
import { useMutation } from "@tanstack/react-query"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { passengerServicesApi } from "../../core/passenger-api"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"
import type { RootStackParamList } from "../../navigation/types"
import {
  MenuScaffold,
  PrimaryAction,
  StatusMessage,
  UnderlineField,
} from "../../components/menu/MenuScaffold"
import { EyeIcon, EyeOffIcon, LockIcon } from "../../components/icons/Icons"
import { colors, iconSize, spacing } from "../../design/theme"

type Props = NativeStackScreenProps<RootStackParamList, "Password">

/** Client side we only check what the UI needs to enable the button. */
// 6 mirrors the server (RegisterDto, ChangePasswordDto, UpdatePassengerProfileDto).
const MIN_LENGTH = 6

export function PasswordScreen({ navigation }: Props) {
  const { messages } = useMessages()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready =
    current.length >= MIN_LENGTH &&
    next.length >= MIN_LENGTH &&
    next !== current

  const change = useMutation({
    mutationFn: () => passengerServicesApi.changePassword(current, next, true),
    onSuccess: () => {
      setCurrent("")
      setNext("")
      setError(null)
      Alert.alert(
        tr(messages, "password.doneTitle"),
        tr(messages, "password.doneBody"),
        [{ text: tr(messages, "common.ok"), onPress: () => navigation.goBack() }],
      )
    },
    // The server owns the rules (length, character classes, reuse). We simply
    // surface its refusal instead of duplicating the policy on screen.
    onError: () => setError(tr(messages, "password.error")),
  })

  return (
    <MenuScaffold
      title={tr(messages, "password.title")}
      onBack={() => navigation.goBack()}
    >
      <UnderlineField
        leading={<LockIcon size={iconSize.md} color={colors.gold} />}
        value={current}
        onChangeText={(value) => {
          setCurrent(value)
          setError(null)
        }}
        placeholder={tr(messages, "password.current")}
        secureTextEntry={!showCurrent}
        textContentType="password"
        autoCapitalize="none"
        autoCorrect={false}
        trailing={
          <Pressable
            onPress={() => setShowCurrent((value) => !value)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={tr(messages, "password.toggle")}
          >
            {showCurrent ? (
              <EyeOffIcon size={iconSize.md} color={colors.gold} />
            ) : (
              <EyeIcon size={iconSize.md} color={colors.gold} />
            )}
          </Pressable>
        }
      />

      <UnderlineField
        leading={<LockIcon size={iconSize.md} color={colors.gold} />}
        value={next}
        onChangeText={(value) => {
          setNext(value)
          setError(null)
        }}
        placeholder={tr(messages, "password.new")}
        secureTextEntry={!showNext}
        textContentType="newPassword"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => ready && change.mutate()}
        trailing={
          <Pressable
            onPress={() => setShowNext((value) => !value)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={tr(messages, "password.toggle")}
          >
            {showNext ? (
              <EyeOffIcon size={iconSize.md} color={colors.gold} />
            ) : (
              <EyeIcon size={iconSize.md} color={colors.gold} />
            )}
          </Pressable>
        }
      />

      {error ? <StatusMessage danger>{error}</StatusMessage> : null}

      <PrimaryAction
        label={tr(messages, "password.save")}
        onPress={() => change.mutate()}
        disabled={!ready}
        loading={change.isPending}
      />
    </MenuScaffold>
  )
}

export default PasswordScreen
