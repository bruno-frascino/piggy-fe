import { isAxiosError } from 'axios';

export function mutationErrorMessage(error: unknown, fallback: string): string {
  if (
    isAxiosError<{ error?: unknown; message?: unknown }>(error) &&
    (error.response?.status === 409 ||
      (error.response?.status === 422 &&
        error.response.data?.error === 'Insufficient Cash')) &&
    typeof error.response.data?.message === 'string' &&
    error.response.data.message.trim()
  ) {
    return error.response.data.message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
