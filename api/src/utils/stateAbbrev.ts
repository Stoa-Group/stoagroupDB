/**
 * Normalize full US state names to 2-letter postal abbreviations.
 * Used when reading from DB (so "LOUISIANA" is returned as "LA") and when writing (so incoming "Louisiana" is stored as "LA").
 */

const FULL_NAME_TO_ABBR: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  'DISTRICT OF COLUMBIA': 'DC',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
  // Territories (optional)
  'AMERICAN SAMOA': 'AS',
  GUAM: 'GU',
  'NORTHERN MARIANA ISLANDS': 'MP',
  'PUERTO RICO': 'PR',
  'U.S. VIRGIN ISLANDS': 'VI',
  'VIRGIN ISLANDS': 'VI',
};

/**
 * Convert a state value to 2-letter abbreviation.
 * - Full name (e.g. "LOUISIANA", "Louisiana") → "LA"
 * - Already 2 letters → uppercase (e.g. "la" → "LA")
 * - Null/empty → null
 * - Unknown string → returned as-is (trimmed)
 */
export function normalizeState(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  const upper = s.toUpperCase();
  const abbr = FULL_NAME_TO_ABBR[upper];
  if (abbr) return abbr;
  if (s.length === 2) return upper;
  return s;
}

/**
 * Recursively normalize State and HQState in API response payloads (objects or arrays).
 * So full names from the DB are returned as abbreviations.
 */
export function normalizeStateInPayload<T>(payload: T): T {
  if (payload == null) return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeStateInPayload(item)) as T;
  }
  if (typeof payload === 'object') {
    const out = { ...payload } as Record<string, unknown>;
    if (typeof out.State === 'string') out.State = normalizeState(out.State);
    if (typeof out.HQState === 'string') out.HQState = normalizeState(out.HQState);
    return out as T;
  }
  return payload;
}
