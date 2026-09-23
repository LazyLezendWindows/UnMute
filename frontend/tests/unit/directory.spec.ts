import { describe, it, expect } from 'vitest';
import { formatDistance, institutionMeta, placeMeta } from '../../src/services/directory';
import { Institution, Place } from '../../src/types';

const place = (p: Partial<Place>): Place => ({
  id: '1', kind: 'city', name: 'X', districtName: null, stateName: null, displayName: 'X', ...p,
});

describe('directory formatting', () => {
  it('describes bucketed distances without false precision', () => {
    expect(formatDistance(2)).toBe('within 2 km');
    expect(formatDistance(10)).toBe('within 10 km');
    expect(formatDistance(45)).toBe('about 45 km away');
    expect(formatDistance(null)).toBe('');
  });

  it('labels places with their kind and hierarchy', () => {
    expect(placeMeta(place({ name: 'Kandi', kind: 'village', displayName: 'Kandi, Sangareddy, Telangana' }))).toBe(
      'Village · Sangareddy, Telangana'
    );
    expect(placeMeta(place({ name: 'Telangana', kind: 'state', displayName: 'Telangana' }))).toBe('State');
  });

  it('shows the full institution name only when a short name is used', () => {
    const inst: Institution = {
      id: '1', name: 'Indian Institute of Technology Hyderabad', shortName: 'IIT Hyderabad', kind: 'university',
      city: 'Kandi', districtName: null, stateName: 'Telangana', aisheCode: null,
    };
    expect(institutionMeta(inst)).toBe('Indian Institute of Technology Hyderabad · Kandi, Telangana');
    expect(institutionMeta({ ...inst, shortName: '' })).toBe('Kandi, Telangana');
  });
});
