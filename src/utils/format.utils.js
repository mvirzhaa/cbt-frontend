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

/**
 * Axios dengan responseType:'blob' tetap membaca body ERROR sebagai Blob,
 * bukan JSON -- jadi error.response.data.message selalu undefined walau
 * backend sudah kirim pesan yang jelas. Pakai ini di catch block request
 * blob (download file) supaya pesan asli dari server tetap kebaca.
 * @param {import('axios').AxiosError} error
 * @param {string} fallback
 * @returns {Promise<string>}
 */
export async function extractBlobErrorMessage(error, fallback) {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) return parsed.message;
    } catch {
      // Bukan JSON (mis. HTML error page dari proxy) -- pakai fallback
    }
  }
  return error.response?.data?.message || fallback;
}
