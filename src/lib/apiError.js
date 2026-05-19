export function normalizeApiError(error, fallbackMessage = "Request failed") {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.payload?.detail) {
    return error.payload.detail;
  }

  if (error.message) {
    return error.message;
  }

  return fallbackMessage;
}
