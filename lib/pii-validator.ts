/**
 * PII Validation utilities
 * Prevents Protected Health Information from being stored:
 * - Only first names (no last names / full names)
 * - No phone numbers
 * - No street addresses
 * - Doctor names: first name only
 */

const PHONE_REGEX = /(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/;
const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z]{2,}\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Pkwy|Parkway|Hwy|Highway|Cir|Circle)\b/i;
const LAST_NAME_REGEX = /\s+\S+/; // any space followed by more chars = likely last name

/**
 * Validate a first-name-only field.
 * Returns an error string if invalid, or null if valid.
 */
export function validateFirstName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter a first name.';
  if (LAST_NAME_REGEX.test(trimmed)) {
    return 'First name only — no last names allowed to protect privacy.';
  }
  if (PHONE_REGEX.test(trimmed)) {
    return 'Phone numbers are not allowed in the name field.';
  }
  if (trimmed.length > 50) {
    return 'Name is too long — first name only.';
  }
  return null;
}

/**
 * Validate a doctor name field (first name only, "Dr. Firstname" allowed).
 * Returns an error string if invalid, or null if valid.
 */
export function validateDoctorName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // optional field
  // Allow "Dr. Firstname" or just "Firstname" — one word after optional "Dr."
  const withoutPrefix = trimmed.replace(/^Dr\.?\s+/i, '');
  if (LAST_NAME_REGEX.test(withoutPrefix)) {
    return "Doctor's first name only — no last names. (e.g. 'Dr. Sarah' or 'Sarah')";
  }
  if (PHONE_REGEX.test(trimmed)) {
    return 'Phone numbers are not allowed.';
  }
  return null;
}

/**
 * Scan free text for PII patterns.
 * Returns an array of warning strings (empty = clean).
 */
export function detectPiiInText(text: string): string[] {
  const warnings: string[] = [];
  if (PHONE_REGEX.test(text)) {
    warnings.push('This note may contain a phone number. Please remove phone numbers to protect privacy.');
  }
  if (ADDRESS_REGEX.test(text)) {
    warnings.push('This note may contain a street address. Please remove addresses to protect privacy.');
  }
  return warnings;
}

/**
 * Sanitise a first name: trim and strip non-letter characters that have no place in a name.
 */
export function sanitiseFirstName(value: string): string {
  return value.trim().replace(/[^A-Za-zÀ-ÿ'\-]/g, '').slice(0, 50);
}
