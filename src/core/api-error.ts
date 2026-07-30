// ---------------------------------------------------------------------------
// Structured backend errors.
//
// The API answers every failure with the same envelope:
//   { code, message, details, path, requestId, traceId }
//
// Until now the app threw all of that away and rendered `common.error` for
// everything — "حدث خطأ" for an expired fare quote, for an insufficient wallet
// balance and for a 500 alike. This module reads the envelope the server
// ALREADY sends (no contract change, no new endpoint) and turns it into a
// translation key the UI can show.
// ---------------------------------------------------------------------------
import axios from "axios";

/** The error body the backend returns on every non-2xx response. */
export type ApiErrorEnvelope = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  requestId?: string;
};

export type ApiErrorKind =
  | "offline" // the request never reached the server
  | "timeout" // the server did not answer in time
  | "auth" // 401 / 403
  | "client" // 4xx the user can act on
  | "server" // 5xx
  | "unknown";

export type ApiError = {
  kind: ApiErrorKind;
  status?: number;
  /** Business code from the envelope, e.g. "INSUFFICIENT_BALANCE". */
  code?: string;
  /** Extra payload, e.g. { min, max, proposed } for FARE_OFFER_OUT_OF_RANGE. */
  details?: Record<string, unknown>;
  /** Correlation id — shown to support, never parsed. */
  requestId?: string;
  /** Translation key to render. Always resolvable. */
  messageKey: string;
  /** Whether retrying the exact same request can plausibly succeed. */
  retryable: boolean;
};

/**
 * Business codes the backend documents. Anything not listed here still gets a
 * sensible key through the `error.<CODE>` convention, and `tr()` falls back to
 * a humanised form, so an unknown code is never rendered as an empty string.
 */
const KNOWN_CODES = new Set([
  "ACTIVE_TRIP_EXISTS",
  "CITY_CAPACITY_REJECTED",
  "INSUFFICIENT_BALANCE",
  "FARE_QUOTE_EXPIRED",
  "FARE_QUOTE_INVALID_STATE",
  "FARE_QUOTE_NOT_FOUND",
  "FARE_OFFER_OUT_OF_RANGE",
]);

/** Normalises any thrown value into something the UI can render. */
export function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return { kind: "unknown", messageKey: "common.error", retryable: false };
  }

  // No response object at all: the radio is down, DNS failed, or the socket
  // was cut before any byte came back.
  if (!error.response) {
    const timedOut = error.code === "ECONNABORTED";
    return {
      kind: timedOut ? "timeout" : "offline",
      messageKey: timedOut ? "error.timeout" : "error.offline",
      retryable: true,
    };
  }

  const status = error.response.status;
  const body = (error.response.data ?? {}) as ApiErrorEnvelope;
  const code = typeof body.code === "string" ? body.code : undefined;

  const kind: ApiErrorKind =
    status === 401 || status === 403
      ? "auth"
      : status >= 500
        ? "server"
        : status >= 400
          ? "client"
          : "unknown";

  const messageKey = code
    ? `error.${code}`
    : kind === "server"
      ? "error.server"
      : "common.error";

  return {
    kind,
    status,
    code,
    details: body.details,
    requestId: body.requestId,
    messageKey,
    // 5xx and 429 are transient; a validated 4xx will fail again identically.
    retryable: kind === "server" || status === 429,
  };
}

/** True when the code is one the product has a specific message for. */
export function isKnownCode(code?: string): boolean {
  return !!code && KNOWN_CODES.has(code);
}

/**
 * React Query retry predicate. Replaces the blanket `retry: 2`, which happily
 * fired three requests at a 400 the user could never satisfy.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return toApiError(error).retryable;
}
