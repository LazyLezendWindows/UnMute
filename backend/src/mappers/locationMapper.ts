export type PlaceKind = 'state' | 'district' | 'subdistrict' | 'city' | 'town' | 'village';
export type LabelPrecision = 'locality' | 'city' | 'state';

export interface PlaceNames {
  kind: PlaceKind;
  name: string;
  districtName: string | null;
  stateName: string | null;
}

/** Joins name parts, dropping blanks and repeats ("Hyderabad, Hyderabad, Telangana" → "Hyderabad, Telangana"). */
function join(...parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  return parts
    .filter((p): p is string => {
      if (!p) return false;
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}

/**
 * The area name other members see, at the member's chosen precision:
 * - `locality`: the place itself — "Kandi, Sangareddy", "Hyderabad, Telangana"
 * - `city`: villages and sub-districts widen to their district — "Sangareddy, Telangana"
 * - `state`: only the state — "Telangana"
 */
export function locationLabel(place: PlaceNames, precision: LabelPrecision): string {
  const state = place.kind === 'state' ? place.name : place.stateName;
  if (precision === 'state' || place.kind === 'state') return state || place.name;

  const isSettlementOrDistrict = place.kind === 'city' || place.kind === 'town' || place.kind === 'district';
  if (isSettlementOrDistrict) return join(place.name, state);

  // Villages and sub-districts
  return precision === 'locality' ? join(place.name, place.districtName || state) : join(place.districtName, state);
}

/** A place as listed in search results and pickers: always fully qualified, for disambiguation. */
export function placeDisplayName(place: PlaceNames): string {
  if (place.kind === 'state') return place.name;
  if (place.kind === 'district') return join(place.name, place.stateName);
  return join(place.name, place.districtName, place.stateName);
}

/** mysql2 returns DECIMAL columns as strings. */
export function toCoordinate(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
