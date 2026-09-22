/**
 * Calculates age in full years from a date of birth string (YYYY-MM-DD).
 */
export function calculateAge(dobString: string): number {
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) {
    return -1;
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function isAtLeast18YearsOld(dobString: string, minAge = 18): boolean {
  const age = calculateAge(dobString);
  return age >= minAge;
}
