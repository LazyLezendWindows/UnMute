import { AppError } from '../middleware/errorHandler';
import { parsePreferences, toPublicProfile } from '../mappers/profileMapper';
import { DiscoverFilters, ProfileRepository } from '../repositories/profileRepository';
import { InterestRepository } from '../repositories/interestRepository';
import { DiscoverQuery } from '../validators/discoverValidator';
import { distanceBucketKm } from './location/distance.service';
import { UserLocationService } from './location/geolocation.service';
import { EducationService } from './educationService';

/** `YYYY-MM-DD` for today minus `years`, in UTC. */
function yearsAgo(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export class DiscoverService {
  /** Turns validated query options into repository filters, resolving anything relative to the viewer. */
  static async resolveFilters(viewerId: string, query: Partial<DiscoverQuery>): Promise<DiscoverFilters> {
    const origin = await UserLocationService.originFor(viewerId);
    if (query.radiusKm !== undefined && !origin) {
      throw new AppError('Set your area on your profile to filter by distance.', 400);
    }

    let institutionId = query.institutionId;
    if (query.sameInstitution) {
      institutionId = (await EducationService.institutionIdFor(viewerId)) ?? undefined;
      if (!institutionId) {
        throw new AppError('Add your college to your profile to find people from it.', 400);
      }
    }

    return {
      origin,
      radiusKm: query.radiusKm,
      placeId: query.placeId,
      pincode: query.pincode,
      institutionId,
      // Age a ⇔ born on or before (today − a years); age ≤ b ⇔ born after (today − (b+1) years).
      bornOnOrBefore: query.minAge !== undefined ? yearsAgo(query.minAge) : undefined,
      bornAfter: query.maxAge !== undefined ? yearsAgo(query.maxAge + 1) : undefined,
    };
  }

  static async getFeed(currentUserId: string, query: Partial<DiscoverQuery> = {}) {
    const filters = await this.resolveFilters(currentUserId, query);
    const candidates = await ProfileRepository.findDiscoverable(
      currentUserId,
      filters,
      query.limit ?? 20,
      query.offset ?? 0
    );
    const interestsByUser = await InterestRepository.forUsers([currentUserId, ...candidates.map((c) => c.user_id)]);
    const myInterestIds = new Set((interestsByUser.get(currentUserId) ?? []).map((i) => i.id));

    return candidates.map((candidate) => {
      const interests = interestsByUser.get(candidate.user_id) ?? [];
      const common = interests.filter((i) => myInterestIds.has(i.id));
      return {
        ...toPublicProfile(candidate.user_id, candidate),
        interactionPreferences: parsePreferences(candidate.interaction_preferences),
        interests,
        commonInterestsCount: common.length,
        commonInterests: common.map((i) => i.name),
        // Bucketed upper bound, never the computed figure.
        distanceKm: candidate.distance_km === null ? null : distanceBucketKm(Number(candidate.distance_km)),
      };
    });
  }
}
