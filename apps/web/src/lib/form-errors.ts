import { ApiError } from './api-client.js';
import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';

// Map an ApiError response into react-hook-form field errors + a
// top-level banner error. The backend's 422 VALIDATION_ERROR includes
// a `details` array shaped like Zod issues:
//   [{ path: ['field', ...], message: '...' }]
//
// We match path[0] against the form's field names. Anything without a
// known field goes into the returned bannerError string.

export function mapApiErrorToForm<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
): { bannerError: string | null } {
  if (!(err instanceof ApiError)) {
    return { bannerError: err instanceof Error ? err.message : 'Unknown error' };
  }

  const details = err.details;
  if (Array.isArray(details)) {
    let matched = false;
    for (const issue of details as Array<{ path?: unknown; message?: string }>) {
      const path = Array.isArray(issue.path) ? issue.path : [];
      const field = typeof path[0] === 'string' ? path[0] : undefined;
      if (field) {
        setError(field as Path<T>, {
          type: 'server',
          message: issue.message ?? 'Invalid value',
        });
        matched = true;
      }
    }
    if (matched) return { bannerError: null };
  }

  return { bannerError: err.message };
}
