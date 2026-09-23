import { AppError } from '../middleware/errorHandler';
import { InstitutionRepository, InstitutionRow, InstitutionKind } from '../repositories/institutionRepository';
import { UserEducationRepository } from '../repositories/userEducationRepository';
import { SetEducationInput } from '../validators/educationValidator';

export function toInstitution(row: InstitutionRow) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    kind: row.kind,
    city: row.city,
    districtName: row.district_name,
    stateName: row.state_name,
    aisheCode: row.aishe_code,
  };
}

export class EducationService {
  static async searchInstitutions(options: {
    q?: string;
    stateId?: string;
    districtId?: string;
    kind?: InstitutionKind;
    limit: number;
    offset: number;
  }) {
    const rows = await InstitutionRepository.search({ ...options, term: options.q });
    return rows.map(toInstitution);
  }

  static async getInstitution(id: string) {
    const row = await InstitutionRepository.findById(id);
    if (!row) {
      throw new AppError('Institution not found', 404);
    }
    return toInstitution(row);
  }

  static async setEducation(userId: string, input: SetEducationInput): Promise<void> {
    if (!(await InstitutionRepository.findById(input.institutionId))) {
      throw new AppError('That institution is no longer available. Please choose another.', 404);
    }
    await UserEducationRepository.upsert(userId, input);
  }

  static clearEducation(userId: string): Promise<void> {
    return UserEducationRepository.remove(userId);
  }

  /** The member's institution id, if they have added one. */
  static async institutionIdFor(userId: string): Promise<string | null> {
    return (await UserEducationRepository.find(userId))?.institution_id ?? null;
  }
}
