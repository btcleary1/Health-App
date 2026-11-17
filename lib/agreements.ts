import { r2Get, r2Put } from './r2';
import { TERMS_VERSION } from './legal';

// Records which version of the Terms and Privacy each person agreed to, and when
// (sign-up checkboxes, the agreement screen, and the "authorized user" box at sign-in),
// plus when they gave explicit consent to collecting their consumer health data.
type Agreement = { version: string; at: string; ip?: string; healthConsentAt?: string };

const path = (userId: string) => `health-app/agreements/${userId}.json`;

export async function recordAgreement(userId: string, ip?: string, opts: { healthConsent?: boolean } = {}): Promise<void> {
  const prev = await r2Get<Agreement>(path(userId)).catch(() => null);
  const healthConsentAt = opts.healthConsent ? (prev?.healthConsentAt ?? new Date().toISOString()) : prev?.healthConsentAt;
  if (prev?.version === TERMS_VERSION && prev.healthConsentAt === healthConsentAt) return;
  const at = prev?.version === TERMS_VERSION ? prev.at : new Date().toISOString();
  await r2Put(path(userId), JSON.stringify({ version: TERMS_VERSION, at, ip, healthConsentAt } satisfies Agreement));
}

// The Terms version to put in the session when this person has agreed to the current Terms
// AND consented to health data collection; otherwise undefined (the agreement screen shows).
export async function agreedVersion(userId: string): Promise<string | undefined> {
  const rec = await r2Get<Agreement>(path(userId)).catch(() => null);
  return rec?.version === TERMS_VERSION && rec.healthConsentAt ? TERMS_VERSION : undefined;
}
