# CURRENT – Charging Stations Map

An Ionic + Angular web app that shows EV charging stations on a map. Users can see station and connector details, filter stations, search for an address, show their own location, and save favorite stations and connectors.

The project uses GitHub Actions for lint, build, unit and e2e tests: [GitHub Actions](https://github.com/vlatkoMiloshevski/code-challenge-current/actions).

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
| `npm run build` | Production build into `dist/` |
| `npm run watch` | Development build that rebuilds on change |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (see [Testing](#testing)) |
| `npm run e2e:e2e` | Generate the BDD tests and run the Playwright end-to-end tests |
| `npm run e2e:e2e-ui` | Same as above, in Playwright UI mode |

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
│   ├── interceptors     HTTP interceptor
│   ├── mappers          Conversion from API types to domain models
│   ├── models           Domain models used by the UI
│   ├── services         HTTP services (stations, geocoding)
│   └── utils            Small helpers (media query signal)
├── features
│   ├── favorites        Favorite stations and connectors (service and storage)
│   ├── filters          Filter logic, filter bar and filter storage
│   ├── map              MapLibre map component and GeoJSON conversion
│   ├── search           Address search component
│   └── station-details  Station details (side panel or bottom sheet)
├── shared
│   └── url-state        Reading and writing the URL parameters
└── home                 Page that connects the features

src/e2e                  End-to-end tests (Playwright with playwright-bdd)
├── features             Gherkin scenarios (*.feature)
├── steps                Step definitions for the scenarios
└── mocks                Mocked API responses used by the tests

src/testing              Shared test helpers and the Ionic stub for Jest
```

Data flow: `StationApiService` loads the stations and maps them to domain models. `HomePage` reads the URL parameters, derives the visible stations, and passes them to the map and the filter bar. Filters, favorites and search write to the URL or to `localStorage`, and the page reacts to those changes.

## Technical decisions

- **Map library: MapLibre GL JS.** Clustering runs natively in a web worker on a GeoJSON source, so tens of thousands of markers are rendered with WebGL, not as DOM elements.
- **Map style: OpenFreeMap.** A free vector style that needs no API key.
- **Geocoding: Nominatim.** Free and without a key. The public instance allows about one request per second and does not allow autocomplete, so search runs about a second after the user stops typing (or on Enter) and the query needs at least 3 characters. Each search is one request. A pause in typing triggers it, so the request rate stays low, but this is still a search-as-you-type pattern and should be checked against the Nominatim usage policy before production.
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

The helper is excluded from production builds at compile time. `angular.json` replaces `src/app/core/dev/synthetic-stations.ts` with `synthetic-stations.prod.ts` in the production configuration. The replacement returns `null` and does not import the generator, so the generator code is not in `dist/`. The development build includes it.

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
- **Production data is a static copy.** The hosted site reads `src/assets/data/*.json`, so it does not show changes made to the dummyjson responses until the copies are refreshed (see [Data in production](#data-in-production)).
- **Favorites** are stored only in the current browser. They are not synchronized between devices.
- **Status values:** the app accepts only the statuses it knows (`Available`, `Preparing`, and the station types listed in the code). Other values stop the data from loading and show an error.

## Testing

Unit tests use Jest with `jest-preset-angular` (`npm test`). The challenge suggests Jasmine and Karma, but Jest was chosen for faster runs without a browser. Tests live next to the code as `*.spec.ts`.

```bash
npm test
```

Covered areas:

- **Station details:** fetching, merging with the list data, and the loading, error and retry states (`station-api.service.spec.ts`, `station-details.component.spec.ts`).
- **Filtering:** status and connector logic, and saving and restoring filters in `localStorage` (`station-filters.spec.ts`, `station-filter.storage.spec.ts`).
- **Searching:** the geocoding request and response handling, and the debounce, Enter, clear and error behavior of the search box (`geocoding.service.spec.ts`, `address-search.component.spec.ts`).
- **Favorites:** toggling, persistence and handling of invalid stored data (`favorites.service.spec.ts`).
- **URL state:** parsing and writing the URL parameters (`shared/url-state/station-url-state.spec.ts`).

The Ionic package is replaced by a stub in tests (`src/testing/ionic-angular.stub.ts`), because Jest cannot load it. Component tests therefore check logic, not Ionic rendering. Map rendering (`maplibre-gl`) is not covered yet.

### End-to-end tests

End-to-end tests use Playwright with [playwright-bdd](https://github.com/vitalets/playwright-bdd). The scenarios are written in Gherkin (`Given` / `When` / `Then`) in `src/e2e/features/`, and the step definitions are in `src/e2e/steps/`. The station, detail and geocoding API responses are mocked from `src/e2e/mocks/`, so the tests do not depend on the external services.

```bash
npm run e2e:e2e
```

The command generates the test files from the feature files (`bddgen`) and runs Playwright in Chromium. It starts the dev server on `http://localhost:4200` if it is not already running. The HTML report is written to `e2e/.playwright-output`.

Covered scenarios on the home page: loading the stations, the empty state, the error state with retry, filters from the URL, filter selection, the favorites view, opening station details from the URL, and address search.

## Build

```bash
npm run build
```

### Run the production build

```bash
npx ng serve --configuration production
```

Then open `http://localhost:4200/`. This uses the production configuration (optimized build, no source maps, synthetic-station helper removed). It is still the Angular dev server, not a static host.

The output is written to `dist/`. The MapLibre web worker is copied to `assets/maplibre/` and the star and close icons to `assets/icons/` (see `angular.json`).

## Deployment (Firebase Hosting)

The production site is hosted on Firebase Hosting:

- **URL:** https://code-challenge-station-map.web.app
- **Firebase project:** `code-challenge-station-map` (set as the default in `.firebaserc`)
- **Hosting config:** `firebase.json` serves the `dist/` folder and rewrites every path to `/index.html`, so the client-side routes (for example `/home`) work when opened directly.

### Data in production

The hosted site cannot call the dummyjson API directly, because dummyjson allows CORS only from `http://localhost:4200`. The environment files choose the data source per build:

| Build | Station data |
| --- | --- |
| Development (`src/environments/environment.ts`) | Live dummyjson endpoints |
| Production (`src/environments/environment.prod.ts`) | Static copies in `src/assets/data/stations.json` and `src/assets/data/station-detail.json` |

To refresh the static copies, download the responses again and rebuild:

```bash
curl -sSf https://dummyjson.com/c/a8f2-a16e-4e37-a9d6 -o src/assets/data/stations.json
curl -sSf https://dummyjson.com/c/dc70-4ec5-44d3-9b41 -o src/assets/data/station-detail.json
```

### Manual deploy

Requires the Firebase CLI (already available through `npx`) and a logged-in account with access to the project:

```bash
npx firebase login
npm run build
npx firebase deploy --only hosting --project code-challenge-station-map
```

The `dist/` folder is the only thing uploaded. Firebase keeps a local cache in `.firebase/`, which is ignored by Git.

### Automatic deploy (GitHub Actions)

The `deploy` job in `.github/workflows/ci.yml` runs only on a push to `master` and only after the `build`, `unit` and `e2e` jobs pass. It uses the `FIREBASE_SERVICE_ACCOUNT_CODE_CHALLENGE_STATION_MAP` repository secret and publishes to the `live` channel of Firebase Hosting.

### PWA

The app is a Progressive Web App. The Angular service worker (`ngsw-config.json`) is enabled in production builds only. It caches the app shell, the static assets and the static station data, so the app opens offline after the first visit. The web manifest is in `src/assets/manifest.webmanifest`.
