/**
 * Formats seconds into a string representation: HH:MM:SS or MM:SS
 * @param {number} seconds 
 * @returns {string}
 */
export function formatWaktu(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats date into standard Indonesian locale string
 * @param {string | Date} dateVal 
 * @returns {string}
 */
export function formatDate(dateVal) {
  if (!dateVal) return '-';
  return new Date(dateVal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
