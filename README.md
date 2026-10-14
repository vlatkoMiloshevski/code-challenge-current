# CURRENT – Charging Stations Map

An Ionic + Angular web app that shows EV charging stations on a map. Users can see station and connector details, filter stations, search for an address, show their own location, and save favorite stations and connectors.

The app runs in the browser and is responsive: on desktop the station details open in a side panel, on mobile they open in a bottom sheet (`ion-modal`).

## Requirements

- Node.js (a current LTS version) and npm
- Modern browser (Chrome, Edge, Firefox or Safari)

## Setup

```bash
npm install
npm start
```

Then open `http://localhost:4200/`. The app redirects to `/home`.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the development server |
| `npm run build` | Production build into `www/` |
| `npm run watch` | Development build that rebuilds on change |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (see [Testing](#testing)) |

## Usage

- **Map:** stations are drawn as markers. Nearby stations are grouped into clusters with a count. Click a cluster to zoom into it. The marker color shows the status: green for available, red for full, gray for closed.
- **Station details:** click a marker to open the details. The panel shows the connectors, the charge points (status, power, voltage, charger code and connector types), pricing, and the operator's contact information.
- **Filters:** filter by status (Available, Full, Closed) and by connector type. Filters are saved in `localStorage` and restored on the next visit.
- **Address search:** type an address and press Enter. The results come from OpenStreetMap (Nominatim). Choose a result to move the map there.
- **My location:** use the location button on the map. The browser asks for permission. If permission is denied or the position is unavailable, a message explains why.
- **Favorites:** click the star on a station or on a charge point (connector) to save it. The **Favorites** chip under the filters shows only favorite stations, and shows the counts of saved stations and connectors. Favorites are saved in `localStorage`.

## Shareable URL state

The page state is stored in the URL, so a link opens the same view:

| Parameter | Meaning | Example |
| --- | --- | --- |
| `station` | Open station (by id) | `?station=34684` |
| `q` | Address search text | `?q=Karl%20Johans%20gate%2C%20Oslo` |
| `status` | Status filter | `?status=available,full` |
| `connectors` | Connector filter | `?connectors=CCS2,CHAdeMO` |
| `view` | `favorites` shows only favorite stations | `?view=favorites` |

When the page is loaded without filter parameters, the stored filters are written into the URL.

## Project structure

```text
src/app
├── core                 Shared code without UI
│   ├── api              Raw API response types (DTOs) and the error class
│   ├── config           Endpoints and geocoding settings
│   ├── dev              Development-only helper (synthetic stations)
│   ├── mappers          Conversion from API types to domain models
│   ├── models           Domain models used by the UI
│   ├── services         HTTP services (stations, geocoding)
│   └── ui               Small UI helpers (media query signal)
├── features
│   ├── favorites        Favorite stations and connectors (service and storage)
│   ├── filters          Filter logic, filter bar and filter storage
│   ├── map              MapLibre map component and GeoJSON conversion
│   ├── search           Address search component
│   ├── station-details  Station details (side panel or bottom sheet)
│   └── url-state        Reading and writing the URL parameters
└── home                 Page that connects the features
```

Data flow: `StationApiService` loads the stations and maps them to domain models. `HomePage` reads the URL parameters, derives the visible stations, and passes them to the map and the filter bar. Filters, favorites and search write to the URL or to `localStorage`, and the page reacts to those changes.

## Technical decisions

- **Map library: MapLibre GL JS.** Clustering runs natively in a web worker on a GeoJSON source, so tens of thousands of markers are rendered with WebGL, not as DOM elements.
- **Map style: OpenFreeMap.** A free vector style that needs no API key.
- **Geocoding: Nominatim.** Free and without a key. The public instance allows about one request per second and does not allow autocomplete, so search runs only when the user presses Enter and the query needs at least 3 characters.
- **State in the URL.** Shareable state (station, search, filters, view) lives in the URL. Personal data (filters defaults and favorites) lives in `localStorage`.
- **Strict data handling.** Unknown station types or charge point statuses are reported as an error instead of being guessed, so the UI shows an error state rather than wrong data.
- **Detail endpoint.** The details endpoint does not accept a station id and returns the same record for every request. The app keeps the identity and status from the station list and takes only charge points, pricing and support information from the details response.
- **Favorites per charge point.** Charge point ids repeat across stations in this dataset, so a favorite connector is stored together with its station id.
- **Responsive layout.** Below 768 px the details open in an `ion-modal` with breakpoints. From 768 px they open in a side panel.

## Development helper: synthetic stations

For performance checks, the app can generate many stations. This works only in development mode:

```text
http://localhost:4200/home?synthetic=10000
```

The generated stations are deterministic, placed around Oslo, and limited to 50 000.

The helper is excluded from production builds at compile time. `angular.json` replaces `src/app/core/dev/synthetic-stations.ts` with `synthetic-stations.prod.ts` in the production configuration. The replacement returns `null` and does not import the generator, so the generator code is not in `www/`. The development build includes it.

### Measured performance (headless Chrome, software rendering)

| Stations | Time until UI is visible | Filter click | Favorites click | JS heap |
| --- | --- | --- | --- | --- |
| 10 000 | 562 ms | 2 ms | 25 ms | 60 MB → 71 MB |
| 20 000 | 473 ms | 23 ms | 15 ms | 74 MB → 76 MB |

These numbers come from a software-rendered headless browser, so on a real device with GPU acceleration the values should be lower.

## Known limitations

- **Location** requires a secure context (HTTPS or `localhost`). Browsers block geolocation otherwise.
- **Address search** uses the public Nominatim instance, which has a rate limit. A production app should use its own Nominatim instance or a commercial geocoder.
- **Station details** come from a mock endpoint that returns the same data for every station. Only the charge points, pricing and contact information differ from the list data.
- **Favorites** are stored only in the current browser. They are not synchronized between devices.
- **Status values:** the app accepts only the statuses it knows (`Available`, `Preparing`, and the station types listed in the code). Other values stop the data from loading and show an error.

## Testing

Unit tests are planned but not yet written. The existing `home.page.spec.ts` is still the default template and does not compile against the current page. The test framework is still to be decided (the project includes Vitest; the challenge mentions Jasmine and Karma).

Priority areas for tests:

- station detail fetching, merging and error states,
- filter logic and filter storage,
- address search request handling,
- favorites toggling and storage,
- URL state parsing and serialization.

## Build

```bash
npm run build
```

The output is written to `www/`. The MapLibre web worker is copied to `assets/maplibre/` and the star and close icons to `assets/icons/` (see `angular.json`).
