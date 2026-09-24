/**
 * A UTC instant in the form MySQL/MariaDB DATETIME columns accept ('2026-09-24 04:44:02.915').
 * Both reject ISO strings with a `T` and `Z`, so every timestamp written from JS goes through this.
 */
export function dbTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

/** Converts an API/ISO timestamp (e.g. a message's createdAt) for use as a DATETIME parameter. */
export function isoToDbTimestamp(iso: string): string {
  return dbTimestamp(new Date(iso));
}
