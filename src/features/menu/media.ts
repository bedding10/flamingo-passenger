// ---------------------------------------------------------------------------
// Image picking helper (UI only).
//
// expo-image-picker is imported lazily so the module is never evaluated during
// the initial bundle: the picker is only needed when the passenger actually
// taps the avatar button in the drawer or in the account page.
//
// No business logic lives here: the caller decides what to do with the local
// URI (today it is passed to the existing PATCH /passenger/me endpoint).
// ---------------------------------------------------------------------------
import { Alert } from "react-native"
import { tr } from "../../core/i18n"

type ImagePickerModule = {
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>
  launchImageLibraryAsync: (options: Record<string, unknown>) => Promise<{
    canceled: boolean
    assets?: Array<{ uri: string }>
  }>
  MediaTypeOptions: { Images: unknown }
}

/**
 * Opens the system gallery and returns the local URI of the picked image,
 * or null when the user cancels or denies the permission.
 */
export async function pickImageFromLibrary(
  messages: Record<string, string> = {},
): Promise<string | null> {
  let picker: ImagePickerModule
  try {
    picker = (await import("expo-image-picker")) as unknown as ImagePickerModule
  } catch {
    Alert.alert(tr(messages, "media.imageTitle"), tr(messages, "media.galleryUnavailable"))
    return null
  }

  const permission = await picker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    Alert.alert(
      tr(messages, "media.permissionTitle"),
      tr(messages, "media.permissionBody"),
    )
    return null
  }

  const result = await picker.launchImageLibraryAsync({
    mediaTypes: picker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  })

  if (result.canceled) return null
  const uri = result.assets?.[0]?.uri
  return uri ?? null
}
