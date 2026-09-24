import { afterEach, describe, expect, it } from 'vitest';
import { calculateAge, isAtLeast18YearsOld, parseCalendarDate, utcToday } from '../src/utils/age';

const on = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
};

describe('parseCalendarDate', () => {
  it.each(['2000-02-31', '2023-02-29', '1999-04-31', '1999-13-01', '1999-00-01', '1999-01-00', '2000-2-3', '20000-01-01', '', 'abcd-ef-gh'])(
    'rejects %j instead of rolling it into another date',
    (value) => {
      expect(parseCalendarDate(value)).toBeNull();
    }
  );

  it('accepts leap days only in leap years', () => {
    expect(parseCalendarDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseCalendarDate('2000-02-29')).not.toBeNull(); // divisible by 400
    expect(parseCalendarDate('1900-02-29')).toBeNull(); // divisible by 100, not 400
  });
});

describe('18+ policy', () => {
  const today = on('2026-09-24');

  it('accepts someone who turns 18 today', () => {
    expect(calculateAge('2008-09-24', today)).toBe(18);
    expect(isAtLeast18YearsOld('2008-09-24', today)).toBe(true);
  });

  it('rejects someone who turns 18 tomorrow', () => {
    expect(calculateAge('2008-09-25', today)).toBe(17);
    expect(isAtLeast18YearsOld('2008-09-25', today)).toBe(false);
  });

  it('accepts a clearly adult date of birth', () => {
    expect(isAtLeast18YearsOld('1990-01-15', today)).toBe(true);
  });

  it('rejects future, impossible and implausibly old dates', () => {
    expect(isAtLeast18YearsOld('2030-01-01', today)).toBe(false);
    expect(isAtLeast18YearsOld('2000-02-31', today)).toBe(false);
    expect(isAtLeast18YearsOld('1850-01-01', today)).toBe(false);
  });

  it('treats a 29 February birthday as reached on 1 March in non-leap years', () => {
    expect(isAtLeast18YearsOld('2004-02-29', on('2022-02-28'))).toBe(false);
    expect(isAtLeast18YearsOld('2004-02-29', on('2022-03-01'))).toBe(true);
    expect(isAtLeast18YearsOld('2006-02-29', on('2024-02-29'))).toBe(false); // 2006-02-29 never existed
  });
});

describe('timezones', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('uses the UTC date, so every server gives the same answer for the same instant', () => {
    // 00:30 on 24 Sep in India is still 23 Sep in UTC.
    const instant = new Date('2026-09-24T00:30:00+05:30');
    const answers = ['UTC', 'Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Kiritimati'].map((tz) => {
      process.env.TZ = tz;
      return [utcToday(instant), isAtLeast18YearsOld('2008-09-24', utcToday(instant))];
    });
    for (const answer of answers) {
      expect(answer).toEqual([{ year: 2026, month: 9, day: 23 }, false]);
    }
  });

  it('does not shift a date of birth by the server offset', () => {
    process.env.TZ = 'America/Los_Angeles'; // `new Date('2008-09-24')` would be 23 Sep here
    expect(calculateAge('2008-09-24', on('2026-09-24'))).toBe(18);
  });
});
