/**
 * Utility functions for normalizing and formatting dates across real estate documents and forms.
 */

export function normalizeDateToISO(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'object') {
    return normalizeDateToISO(raw.normalized_value || raw.value || '');
  }
  const str = String(raw).trim();
  if (!str) return '';

  // 1. Direct YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // 2. MM/DD/YYYY or M/D/YYYY or MM-DD-YYYY
  const mdyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 3. YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 4. Strip ordinals: "September 9th, 2026" -> "September 9, 2026"
  const cleanStr = str.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');

  // Month names dictionary
  const months: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  // e.g. "September 9, 2026" or "Sep 9 2026"
  const monthNameMatch = cleanStr.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthNameMatch) {
    const monthKey = monthNameMatch[1].toLowerCase();
    const m = months[monthKey];
    if (m) {
      return `${monthNameMatch[3]}-${m}-${monthNameMatch[2].padStart(2, '0')}`;
    }
  }

  // e.g. "9 September 2026" or "09-Sep-2026"
  const dayMonthYearMatch = cleanStr.match(/^(\d{1,2})[\s\-]+([A-Za-z]+)[\s\-]+(\d{4})$/);
  if (dayMonthYearMatch) {
    const monthKey = dayMonthYearMatch[2].toLowerCase();
    const m = months[monthKey];
    if (m) {
      return `${dayMonthYearMatch[3]}-${m}-${dayMonthYearMatch[1].padStart(2, '0')}`;
    }
  }

  // 5. Fallback: Parse with Date object avoiding timezone day-shift
  const timestamp = Date.parse(cleanStr);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    if (yr >= 1900 && yr <= 2100) {
      return `${yr}-${mo}-${day}`;
    }
  }

  return str;
}
