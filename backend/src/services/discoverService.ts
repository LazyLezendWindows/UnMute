import { parsePreferences, toPublicProfile } from '../mappers/profileMapper';
import { ProfileRepository } from '../repositories/profileRepository';
import { InterestRepository } from '../repositories/interestRepository';

export class DiscoverService {
  static async getFeed(currentUserId: string, limit = 20, offset = 0) {
    const candidates = await ProfileRepository.findDiscoverable(currentUserId, limit, offset);
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
      };
    });
  }
}
