import { api } from './api';
import { Institution, Place, PlaceKind } from '../types';

/** Reference-data lookups (places, PIN codes, institutions); all filtering happens on the server. */

export async function searchPlaces(q: string, options: { kinds?: PlaceKind[]; stateId?: string } = {}): Promise<Place[]> {
  const res = await api.get('/locations/search', {
    params: { q, kinds: options.kinds?.join(','), stateId: options.stateId, limit: 10 },
  });
  return res.data.data;
}

export interface PincodeInfo {
  pincode: string;
  areaName: string;
  districtId: string | null;
  districtName: string | null;
  stateName: string | null;
}

export async function lookupPincode(pincode: string): Promise<PincodeInfo> {
  const res = await api.get(`/locations/pincodes/${encodeURIComponent(pincode)}`);
  return res.data.data;
}

export async function searchInstitutions(q: string, options: { stateId?: string } = {}): Promise<Institution[]> {
  const res = await api.get('/education/institutions', { params: { q, stateId: options.stateId, limit: 15 } });
  return res.data.data;
}

const KIND_LABELS: Record<PlaceKind, string> = {
  state: 'State',
  district: 'District',
  subdistrict: 'Sub-district',
  city: 'City',
  town: 'Town',
  village: 'Village',
};

export function placeKindLabel(kind: PlaceKind | null | undefined): string {
  return kind ? KIND_LABELS[kind] : '';
}

/** Secondary line for a place option: its kind and the rest of its hierarchy. */
export function placeMeta(place: Place): string {
  const rest = place.displayName.startsWith(`${place.name}, `)
    ? place.displayName.slice(place.name.length + 2)
    : place.kind === 'state'
      ? ''
      : place.displayName;
  return [placeKindLabel(place.kind), rest].filter(Boolean).join(' · ');
}

export function institutionMeta(institution: Institution): string {
  const where = [institution.city, institution.stateName].filter(Boolean).join(', ');
  const full = institution.shortName && institution.shortName !== institution.name ? institution.name : '';
  return [full, where].filter(Boolean).join(' · ');
}

/** "within 10 km" for short distances, "about 45 km away" beyond; the API only sends bucketed values. */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return '';
  return km <= 10 ? `within ${km} km` : `about ${km} km away`;
}
