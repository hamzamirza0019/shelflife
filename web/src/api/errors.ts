import axios from "axios"

type BackendError = { message?: string }

export function getApiErrorMessage(error: unknown, fallback = "The request could not be completed.") {
  if (axios.isAxiosError<BackendError>(error)) {
    return error.response?.data?.message ?? (error.response ? fallback : "Unable to reach the ShelfLife server.")
  }
  return error instanceof Error ? error.message : fallback
}