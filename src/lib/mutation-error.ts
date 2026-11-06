import { isAxiosError } from 'axios';

export function mutationErrorMessage(error: unknown, fallback: string): string {
  if (
    isAxiosError<{ message?: unknown }>(error) &&
    error.response?.status === 409 &&
    typeof error.response.data?.message === 'string' &&
    error.response.data.message.trim()
  ) {
    return error.response.data.message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
