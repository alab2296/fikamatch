export const MINIMUM_AGE = 18;

/** Whole years between a YYYY-MM-DD birth date and `now` (UTC). Null if the date is invalid. */
export function ageOn(birthDate: string, now: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  let age = now.getUTCFullYear() - year;
  const beforeBirthday =
    now.getUTCMonth() + 1 < month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function isAdult(birthDate: string, now: Date = new Date()): boolean {
  const age = ageOn(birthDate, now);
  return age !== null && age >= MINIMUM_AGE;
}
