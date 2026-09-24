export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export const MINIMUM_AGE = 18;
const OLDEST_BIRTH_YEAR = 1900;

/**
 * Parses a strict `YYYY-MM-DD` calendar date. Returns null for malformed or impossible dates
 * (e.g. 2000-02-31, 2023-02-29) instead of letting `Date` roll them into the next month.
 */
export function parseCalendarDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1) return null;
  // Day 0 of the next month is the last day of this one; UTC so the server timezone never matters.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth ? { year, month, day } : null;
}

/** Today's date in UTC: age checks give the same answer on every server, whatever its timezone. */
export function utcToday(now: Date = new Date()): CalendarDate {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
}

/**
 * Age in full years on `today`. A 29 February birthday is reached on 1 March in non-leap years.
 * Returns -1 for an invalid date.
 */
export function calculateAge(dob: string, today: CalendarDate = utcToday()): number {
  const birth = parseCalendarDate(dob);
  if (!birth) return -1;
  let age = today.year - birth.year;
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) {
    age--;
  }
  return age;
}

/** A real, plausible date of birth that is not in the future (age aside). */
export function isPlausibleDateOfBirth(dob: string, today: CalendarDate = utcToday()): boolean {
  const birth = parseCalendarDate(dob);
  return birth !== null && birth.year >= OLDEST_BIRTH_YEAR && calculateAge(dob, today) >= 0;
}

export function isAtLeast18YearsOld(dob: string, today: CalendarDate = utcToday()): boolean {
  return isPlausibleDateOfBirth(dob, today) && calculateAge(dob, today) >= MINIMUM_AGE;
}
