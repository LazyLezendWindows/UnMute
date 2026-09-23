import { getDatabase } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { LabelPrecision } from '../../mappers/locationMapper';
import { PlaceRepository, toCoordinates } from '../../repositories/placeRepository';
import { ProfileRepository } from '../../repositories/profileRepository';
import { UserLocationRepository, LocationSource } from '../../repositories/userLocationRepository';
import { SetLocationInput } from '../../validators/locationValidator';
import { Coordinates, isWithinIndia, snapToGrid } from './distance.service';
import { GeocodingService } from './geocoding.service';

interface ResolvedLocation {
  placeId: string | null;
  pincode: string | null;
  coordinates: Coordinates | null;
  source: LocationSource;
}

/** A member's own area: where discovery measures distance from, and what others see about it. */
export class UserLocationService {
  static async setLocation(userId: string, input: SetLocationInput): Promise<void> {
    const resolved = await this.resolve(input);
    await getDatabase().transaction(async (tx) => {
      await UserLocationRepository.upsert(tx, userId, { ...resolved, precision: input.precision });
      // The structured area replaces the old free-text location, so the two can never disagree.
      await ProfileRepository.update(tx, userId, { approximate_location: '' });
    });
  }

  static async setPrecision(userId: string, precision: LabelPrecision): Promise<void> {
    if (!(await UserLocationRepository.setPrecision(userId, precision))) {
      throw new AppError('Set your area first, then choose how much of it to show.', 404);
    }
  }

  static clearLocation(userId: string): Promise<void> {
    return UserLocationRepository.remove(userId);
  }

  /** The viewer's stored (coarsened) coordinates, used as the origin for distance filters. */
  static async originFor(userId: string): Promise<Coordinates | null> {
    return toCoordinates(await UserLocationRepository.find(userId));
  }

  private static async resolve(input: SetLocationInput): Promise<ResolvedLocation> {
    switch (input.mode) {
      case 'place': {
        const place = await GeocodingService.requirePlace(input.placeId);
        if (place.kind === 'state') {
          throw new AppError('Please choose a district, city, town or village rather than a whole state.', 400);
        }
        return {
          placeId: place.id,
          pincode: null,
          coordinates: await PlaceRepository.coordinatesFor(place),
          source: 'place',
        };
      }

      case 'pincode': {
        const pin = await GeocodingService.lookupPincode(input.pincode);
        let coordinates = toCoordinates(pin);
        if (!coordinates && pin.district_id) {
          const district = await PlaceRepository.findById(pin.district_id);
          coordinates = district ? await PlaceRepository.coordinatesFor(district) : null;
        }
        return {
          placeId: pin.district_id ?? pin.state_id,
          pincode: pin.pincode,
          coordinates,
          source: 'pincode',
        };
      }

      case 'device': {
        const raw = { latitude: input.latitude, longitude: input.longitude };
        if (!isWithinIndia(raw)) {
          throw new AppError('Unmute is available in India only. Please search for your area instead.', 422);
        }
        // Only the grid cell is ever used or stored; the exact position is discarded here.
        const coordinates = snapToGrid(raw);
        const place = await GeocodingService.placeNear(coordinates);
        return { placeId: place.id, pincode: null, coordinates, source: 'device' };
      }
    }
  }
}
