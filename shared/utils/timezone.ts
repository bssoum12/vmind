/**
 * Resolves the client's local IANA timezone automatically via standard Intl API.
 * Works seamlessly across all global locations (e.g. "Africa/Tunis", "Europe/Paris", "America/New_York", "Asia/Tokyo").
 */
export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * Safely parses any raw trigger hour string (e.g. 'Noon', 'Midnight', '11am', '2pm', '14')
 * into a standardized 2-digit 24h string (e.g. '12', '00', '11', '14', '14').
 */
export const parseHourString = (rawHour: any): string => {
  if (rawHour === undefined || rawHour === null || rawHour === '') return '08';
  const str = String(rawHour).trim().toLowerCase();

  if (str === 'noon') return '12';
  if (str === 'midnight') return '00';

  if (str.endsWith('am')) {
    const val = parseInt(str.replace('am', ''), 10);
    return String(isNaN(val) ? 8 : (val === 12 ? 0 : val)).padStart(2, '0');
  }
  if (str.endsWith('pm')) {
    const val = parseInt(str.replace('pm', ''), 10);
    return String(isNaN(val) ? 20 : (val === 12 ? 12 : val + 12)).padStart(2, '0');
  }

  const val = parseInt(str, 10);
  return String(isNaN(val) ? 8 : val).padStart(2, '0');
};
