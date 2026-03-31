/**
 * PII Validation utilities
 * Prevents Protected Health Information from being stored:
 * - Only first names (no last names / full names)
 * - No phone numbers
 * - No street addresses
 * - Doctor names: first name only
 */

const PHONE_REGEX = /(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/;
const PHONE_REGEX_GLOBAL = /(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/g;
const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z]{2,}\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Pkwy|Parkway|Hwy|Highway|Cir|Circle)\b/i;
const ADDRESS_REGEX_GLOBAL = /\b\d{1,5}\s+[A-Za-z]{2,}\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Pkwy|Parkway|Hwy|Highway|Cir|Circle)\b/gi;
const EMAIL_REGEX_GLOBAL = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SSN_REGEX_GLOBAL = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g;
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

/**
 * Redact detectable PII patterns from free text.
 * Replaces phone numbers, email addresses, street addresses, and SSNs with [REDACTED] labels.
 * Returns the sanitised text and a count of how many replacements were made.
 *
 * Note: last-name detection without an NLP model is unreliable — use name field
 * validation (validateFirstName / validateDoctorName) to prevent full names from being entered.
 */
export function redactPiiFromText(text: string): { redacted: string; changes: number } {
  let redacted = text;
  let changes = 0;

  redacted = redacted.replace(SSN_REGEX_GLOBAL, () => { changes++; return '[SSN REDACTED]'; });
  redacted = redacted.replace(PHONE_REGEX_GLOBAL, () => { changes++; return '[PHONE REDACTED]'; });
  redacted = redacted.replace(EMAIL_REGEX_GLOBAL, () => { changes++; return '[EMAIL REDACTED]'; });
  redacted = redacted.replace(ADDRESS_REGEX_GLOBAL, () => { changes++; return '[ADDRESS REDACTED]'; });

  return { redacted, changes };
}
