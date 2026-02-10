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

/** Known date-only fields returned by pipeline (and related) APIs. Stored as SQL DATE; driver returns Date (UTC midnight). */
const DATE_ONLY_KEYS = new Set([
  'StartDate', 'EstimatedConstructionStartDate', 'ConstructionLoanClosingDate',
  'ExecutionDate', 'DueDiligenceDate', 'ClosingDate', 'ListedDate', 'LandClosingDate',
]);

/**
 * Serialize a Date to "YYYY-MM-DD" using UTC date parts so that SQL DATE 2026-06-15
 * (returned as 2026-06-15T00:00:00.000Z) is sent as "2026-06-15", avoiding timezone shift on the client.
 */
function dateToYYYYMMDD(d: Date): string | null {
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Recursively normalize State and HQState in API response payloads (objects or arrays).
 * Also serializes date-only fields (StartDate, etc.) to "YYYY-MM-DD" so the client displays the correct calendar day.
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
    for (const key of DATE_ONLY_KEYS) {
      if (key in out && out[key] instanceof Date) {
        const str = dateToYYYYMMDD(out[key] as Date);
        if (str != null) out[key] = str;
      }
    }
    return out as T;
  }
  return payload;
}
