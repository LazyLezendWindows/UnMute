import fs from 'fs';
import { parse } from 'csv-parse';

/** "State Name (In English)" → "statenameinenglish": header spellings vary between dataset releases. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export type CsvRecord = Record<string, string>;

/** Streams a CSV file as records keyed by normalised header. Handles a UTF-8 BOM and quoted fields. */
export function readCsv(filePath: string): AsyncIterable<CsvRecord> {
  return fs.createReadStream(filePath).pipe(
    parse({
      bom: true,
      columns: (headers: string[]) => headers.map(normalizeHeader),
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    })
  );
}

/** First non-empty value among the given (normalised) column aliases. */
export function pick(record: CsvRecord, aliases: string[]): string {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined && value !== '' && value.toUpperCase() !== 'NA') return value;
  }
  return '';
}

export function toInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 && n <= 4_294_967_295 ? n : null;
}

export function toFloat(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** "ANDHRA PRADESH" / "the Dadra & Nagar Haveli…" → "andhra pradesh" / "dadra and nagar haveli…". */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Title-cases ALL-CAPS dataset values for display ("NEW DELHI" → "New Delhi"); leaves mixed case alone. */
export function displayName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.toLowerCase().replace(/(^|[\s(\-/.])([a-z])/g, (_, sep, c) => sep + c.toUpperCase());
}

export interface ImportReport {
  rows: number;
  imported: number;
  skipped: number;
  warnings: string[];
}

export function newReport(): ImportReport {
  return { rows: 0, imported: 0, skipped: 0, warnings: [] };
}

/** Keeps the first few warnings with a count of the rest, so a bad file cannot flood the console. */
export function warn(report: ImportReport, message: string): void {
  report.skipped++;
  if (report.warnings.length < 20) report.warnings.push(message);
}
