import { NextRequest, NextResponse } from 'next/server';
import { getStoredHash, hashPassphrase, verifyPassphrase, savePassphraseHash } from '@/lib/passphrase';
import { getSessionFromRequest } from '@/lib/session';
import { checkRateLimit, recordFailure, clearFailures } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const ip = getClientIp(req);
  try {
    await checkRateLimit(ip);

    const { currentPassphrase, newPassphrase } = await req.json();

    if (!currentPassphrase || !newPassphrase) {
      return NextResponse.json({ error: 'Both current and new passphrase are required.' }, { status: 400 });
    }

    if (newPassphrase.length < 8) {
      return NextResponse.json({ error: 'New passphrase must be at least 8 characters.' }, { status: 400 });
    }

    const storedHash = await getStoredHash();
    if (!storedHash) {
      return NextResponse.json({ error: 'No passphrase configured.' }, { status: 500 });
    }

    const valid = await verifyPassphrase(currentPassphrase, storedHash);
    if (!valid) {
      await recordFailure(ip);
      return NextResponse.json({ error: 'Current passphrase is incorrect.' }, { status: 401 });
    }

    await savePassphraseHash(await hashPassphrase(newPassphrase));
    await clearFailures(ip);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('Too many')) {
      return NextResponse.json({ error: msg }, { status: 429 });
    }
    return NextResponse.json({ error: 'An error occurred.' }, { status: 500 });
  }
}
