import { r2Get, r2Put } from './r2';
import { TERMS_VERSION } from './legal';

// Records which version of the Terms and Privacy each person agreed to, and when
// (sign-up checkbox, and the "authorized user" box at every sign-in).
type Agreement = { version: string; at: string; ip?: string };

export async function recordAgreement(userId: string, ip?: string): Promise<void> {
  const prev = await r2Get<Agreement>(`health-app/agreements/${userId}.json`).catch(() => null);
  if (prev?.version === TERMS_VERSION) return;
  await r2Put(`health-app/agreements/${userId}.json`, JSON.stringify({ version: TERMS_VERSION, at: new Date().toISOString(), ip } satisfies Agreement));
}
