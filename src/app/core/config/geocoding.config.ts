// Nominatim (OpenStreetMap) geocoding. The public instance allows about one request per second,
// asks for identifying clients, and does not allow autocomplete. Search is therefore submit-only.
export const GEOCODING = {
  searchUrl: 'https://nominatim.openstreetmap.org/search',
  resultLimit: 5,
  minQueryLength: 3,
} as const;
