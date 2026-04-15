import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import {
  getDealsEmailPreferences,
  saveDealsEmailPreferences,
  DEFAULT_DEALS_PREFS,
  DEALS_CATEGORIES,
  type DealsEmailPreferences,
} from '@/lib/health-data';

export const runtime = 'nodejs';

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];
const VALID_MAX_ITEMS = [3, 5, 10, 20];
const VALID_MIN_DISCOUNTS = [0, 10, 20, 30, 50];
const VALID_PRICE_RANGES = ['any', 'budget', 'mid', 'premium'];
const VALID_CATEGORIES = DEALS_CATEGORIES.map(c => c.value);

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const prefs = await getDealsEmailPreferences(session.userId);
  return NextResponse.json({ prefs });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const prefs: DealsEmailPreferences = {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : DEFAULT_DEALS_PREFS.enabled,
    frequency: VALID_FREQUENCIES.includes(body.frequency) ? body.frequency : DEFAULT_DEALS_PREFS.frequency,
    maxItemsPerEmail: VALID_MAX_ITEMS.includes(body.maxItemsPerEmail) ? body.maxItemsPerEmail : DEFAULT_DEALS_PREFS.maxItemsPerEmail,
    minDiscountPercent: VALID_MIN_DISCOUNTS.includes(body.minDiscountPercent) ? body.minDiscountPercent : DEFAULT_DEALS_PREFS.minDiscountPercent,
    priceRange: VALID_PRICE_RANGES.includes(body.priceRange) ? body.priceRange : DEFAULT_DEALS_PREFS.priceRange,
    categories: Array.isArray(body.categories)
      ? body.categories.filter((c: unknown) => typeof c === 'string' && VALID_CATEGORIES.includes(c as string))
      : DEFAULT_DEALS_PREFS.categories,
    matchTrackedPersons: typeof body.matchTrackedPersons === 'boolean' ? body.matchTrackedPersons : DEFAULT_DEALS_PREFS.matchTrackedPersons,
  };

  await saveDealsEmailPreferences(session.userId, prefs);
  return NextResponse.json({ success: true });
}
