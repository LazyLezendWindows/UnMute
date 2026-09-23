import { AppError } from '../../middleware/errorHandler';
import { PlaceKind, placeDisplayName } from '../../mappers/locationMapper';
import { PlaceRepository, PlaceRow } from '../../repositories/placeRepository';
import { PincodeRepository } from '../../repositories/pincodeRepository';
import { Coordinates } from './distance.service';

/** Places as returned to clients: names and hierarchy only, never coordinates. */
export function toPlace(row: PlaceRow) {
  const names = { kind: row.kind, name: row.name, districtName: row.district_name, stateName: row.state_name };
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    districtName: row.district_name,
    stateName: row.state_name,
    displayName: placeDisplayName(names),
  };
}

/** How far to look for a named place around a device position, smallest settlements first. */
const REVERSE_GEOCODE_STEPS: { kinds: PlaceKind[]; maxKm: number }[] = [
  { kinds: ['city', 'town', 'village'], maxKm: 25 },
  { kinds: ['district'], maxKm: 120 },
];

export class GeocodingService {
  static async states() {
    return (await PlaceRepository.states()).map(toPlace);
  }

  static async children(parentId: string, term: string | undefined, limit: number, offset: number) {
    if (!(await PlaceRepository.findById(parentId))) {
      throw new AppError('Place not found', 404);
    }
    return (await PlaceRepository.children(parentId, term, limit, offset)).map(toPlace);
  }

  static async search(term: string, options: { kinds?: PlaceKind[]; stateId?: string; limit: number }) {
    return (await PlaceRepository.search(term, options)).map(toPlace);
  }

  static async requirePlace(placeId: string): Promise<PlaceRow> {
    const place = await PlaceRepository.findById(placeId);
    if (!place) {
      throw new AppError('That place is no longer available. Please choose another.', 404);
    }
    return place;
  }

  static async lookupPincode(pincode: string) {
    const row = await PincodeRepository.find(pincode);
    if (!row) {
      throw new AppError("We don't recognise that PIN code yet. Try searching for your town or city instead.", 404);
    }
    return row;
  }

  /** Public PIN code details: the area it covers, without coordinates. */
  static async describePincode(pincode: string) {
    const row = await this.lookupPincode(pincode);
    return {
      pincode: row.pincode,
      areaName: row.area_name,
      districtId: row.district_id,
      districtName: row.district_name,
      stateName: row.state_name,
    };
  }

  /** The nearest known settlement (or, failing that, district) to a device position. */
  static async placeNear(point: Coordinates): Promise<PlaceRow> {
    for (const step of REVERSE_GEOCODE_STEPS) {
      const place = await PlaceRepository.nearest(point, step.kinds, step.maxKm);
      if (place) return place;
    }
    throw new AppError(
      "We couldn't match your position to a nearby town yet. Please search for your area instead.",
      422
    );
  }
}
