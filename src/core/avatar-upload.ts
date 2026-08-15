// ---------------------------------------------------------------------------
// Passenger avatar upload.
//
// The server already owns this flow (Cloudflare R2 through StorageService), so
// the app does not implement any upload system of its own. It only follows the
// three steps the backend exposes:
//
//   1. POST /passenger/me/upload-url  -> { uploadUrl, objectPath, readUrl }
//   2. PUT  <uploadUrl>               -> the bytes go straight to R2, never
//                                        through the API server
//   3. PATCH /passenger/me            -> { avatarUrl: objectPath }, done by the
//                                        caller together with the rest of the
//                                        profile so one screen = one save
//
// Step 2 must NOT use the `api` axios instance: that instance prefixes the API
// baseURL and attaches the Bearer token, and a presigned R2 URL rejects an
// extra Authorization header.
// ---------------------------------------------------------------------------
import { api } from "./api"

export type UploadUrlResponse = {
  uploadUrl: string
  objectPath: string
  readUrl: string
  contentType: string
}

/** Guesses the MIME type from the local file URI; the server only accepts image/*. */
function contentTypeFor(uri: string): string {
  const clean = uri.split("?")[0].toLowerCase()
  if (clean.endsWith(".png")) return "image/png"
  if (clean.endsWith(".webp")) return "image/webp"
  if (clean.endsWith(".heic") || clean.endsWith(".heif")) return "image/heic"
  return "image/jpeg"
}

export type UploadedAvatar = {
  /** Object key in storage. This is what gets saved on the profile. */
  key: string
  /** Permanent public URL when R2_PUBLIC_URL is set, otherwise a signed one. */
  url: string
}

/**
 * Uploads a locally picked image and returns the object key to store on the
 * profile plus a URL for immediate display.
 *
 * The key is stored rather than the URL: signed URLs expire, and the server
 * regenerates a fresh URL on every read (UsersService.resolveAvatarUrl).
 *
 * Throws on failure so the caller can keep the passenger on the screen instead
 * of silently saving a local `file://` URI no other device can read.
 */
export async function uploadAvatar(localUri: string): Promise<UploadedAvatar> {
  const contentType = contentTypeFor(localUri)

  const { data } = await api.post<UploadUrlResponse>("/passenger/me/upload-url", {
    contentType,
  })

  const file = await fetch(localUri)
  const blob = await file.blob()

  const uploaded = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": data.contentType || contentType },
    body: blob,
  })
  if (!uploaded.ok) {
    throw new Error(`AVATAR_UPLOAD_FAILED_${uploaded.status}`)
  }

  return { key: data.objectPath, url: data.readUrl }
}

/** True while the URI still points at the device rather than at storage. */
export function isLocalUri(uri: string | null | undefined): boolean {
  if (!uri) return false
  return (
    uri.startsWith("file:") ||
    uri.startsWith("content:") ||
    uri.startsWith("ph:") ||
    uri.startsWith("assets-library:")
  )
}
