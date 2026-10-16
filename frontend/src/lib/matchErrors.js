// Turns a failed /match request into what the matcher page shows: a message and whether a Retry
// button makes sense. Codes come from the server's stable `errorCode` field.
const BY_CODE = {
  AI_TEMPORARILY_UNAVAILABLE: {
    message: "The AI services are temporarily unavailable. Your inputs are preserved; please try again shortly.",
    retryable: true,
  },
  AI_RATE_LIMITED: {
    message: "The AI service is receiving too many requests right now. Wait a minute, then try again.",
    retryable: true,
  },
  AI_QUOTA_EXHAUSTED: {
    message: "The AI service has reached its usage limit for now. Please try again later.",
    retryable: false,
  },
  AI_CONFIGURATION_ERROR: {
    message: "AI service configuration needs attention. Please try again later.",
    retryable: false,
  },
  AI_INVALID_OUTPUT: {
    message: "The AI returned a response we couldn't use. Please try again.",
    retryable: true,
  },
  AI_REQUEST_FAILED: {
    message: "The AI service couldn't process this request. Please try again.",
    retryable: true,
  },
};

export function describeMatchError(err) {
  const response = err?.response;

  if (!response) {
    const timedOut = err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT";
    return {
      message: timedOut
        ? "The analysis took too long to finish. Your inputs are preserved; please try again."
        : "Couldn't reach HireTrack. Check your connection and try again.",
      retryable: true,
    };
  }

  const known = BY_CODE[response.data?.errorCode];
  if (known) return { ...known };

  // Validation errors, the per-user match limit and anything else: show the server's own message.
  // Retrying immediately would not help with those.
  return { message: response.data?.message || "Something went wrong", retryable: false };
}

// The backend reports which provider produced the result; only "backup" changes what we show.
export const usedBackupProvider = (data) => data?.provider === "backup";
