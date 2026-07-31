/**
 * Infrastructure-level error codes — finite and known up front.
 *
 * Domain codes do NOT belong here: each feature declares its own in
 * `modules/<feature>/<feature>.errors.ts`. Keeping a central catalogue of every
 * app code would drag base/ back into depending on modules/.
 *
 * Convention: `<DOMAIN>_<WHAT>`, uppercase. A code is a public contract with the
 * client — never reuse one for a different meaning, never delete one (deprecate).
 * The i18n message key is derived as `errors.<CODE>`, so there is no mapping table.
 */
export const BaseErrorCode = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** Generic 4xx fallback, so an unmapped 422/429 is not mislabelled as a validation error. */
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
} as const;

export type BaseErrorCode = (typeof BaseErrorCode)[keyof typeof BaseErrorCode];

/** i18n key for an error code. Single source of the convention. */
export const errorMessageKey = (code: string): string => `errors.${code}`;
