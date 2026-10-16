import { readFileSync } from 'fs';
import { join } from 'path';

import { Route, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Before, Given, When, Then } = createBdd();

const STATIONS_URL = 'https://dummyjson.com/c/a8f2-a16e-4e37-a9d6';
const STATION_DETAIL_URL = 'https://dummyjson.com/c/dc70-4ec5-44d3-9b41';
const NOMINATIM_HOST = 'nominatim.openstreetmap.org';
const MAP_TILES_HOST = 'tiles.openfreemap.org';

// Playwright runs from the project root, so the mocks are read relative to it.
function loadMock(name: string): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), 'src', 'e2e', 'mocks', name), 'utf8'));
}

// The API sends no CORS header for this origin, so the mocked responses must.
function json(route: Route, body: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });
}

Before(async ({ page }) => {
  // The map style and tiles are not needed for these tests. Blocking them keeps the runs fast and offline-safe.
  await page.route(
    (url) => url.hostname === MAP_TILES_HOST,
    (r) => r.abort(),
  );
});

// Given: the data the page receives

Given('the station service returns the sample stations', async ({ page }) => {
  await page.route(
    (url) => url.href === STATIONS_URL,
    (r) => json(r, loadMock('stations.json')),
  );
  await page.route(
    (url) => url.href === STATION_DETAIL_URL,
    (r) => json(r, loadMock('station-detail.json')),
  );
});

Given('the station list is empty', async ({ page }) => {
  await page.route(
    (url) => url.href === STATIONS_URL,
    (r) => json(r, { Result: [] }),
  );
});

Given('the station service is unavailable', async ({ page }) => {
  await page.route(
    (url) => url.href === STATIONS_URL,
    (r) => r.abort(),
  );
});

Given('the station service fails on the first request only', async ({ page }) => {
  let requests = 0;
  await page.route(
    (url) => url.href === STATIONS_URL,
    (r) => {
      requests += 1;
      return requests === 1 ? r.abort() : json(r, loadMock('stations.json'));
    },
  );
  await page.route(
    (url) => url.href === STATION_DETAIL_URL,
    (r) => json(r, loadMock('station-detail.json')),
  );
});

Given('the address search returns the sample results', async ({ page }) => {
  await page.route(
    (url) => url.hostname === NOMINATIM_HOST,
    (r) => json(r, loadMock('geocode-karl-johans.json')),
  );
});

// When: what the user does

When('I open the home page', async ({ page }) => {
  await page.goto('/home');
});

When('I open the home page with the URL {string}', async ({ page }, query: string) => {
  await page.goto(`/home?${query}`);
});

When('I open the Filters panel', async ({ page }) => {
  await page.getByRole('button', { name: 'Filters' }).click();
});

When('I select the filter {string}', async ({ page }, label: string) => {
  await page.locator('ion-checkbox', { hasText: label }).click();
});

When('I turn on the favorites switch', async ({ page }) => {
  await page.locator('ion-toggle').click();
});

When('I search for the address {string}', async ({ page }, address: string) => {
  await page.getByRole('searchbox').fill(address);
});

When('I click {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).first().click();
});

// Then: what the user sees

Then('the page title is {string}', async ({ page }, title: string) => {
  await expect(page.locator('ion-title')).toHaveText(title);
});

Then('the stations are loaded', async ({ page }) => {
  await expect(page.locator('.filter-overlay')).toBeVisible();
});

Then('I see the message {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message, { exact: true }).first()).toBeVisible();
});

Then('I do not see the message {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message, { exact: true })).toHaveCount(0);
});

Then('the {string} button is visible', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toBeVisible();
});

Then('the details panel shows the station {string}', async ({ page }, name: string) => {
  await expect(page.locator('aside.side-panel h2')).toHaveText(name);
});

Then('the details panel lists the charge point {string}', async ({ page }, name: string) => {
  await expect(page.locator('aside.side-panel').getByText(name, { exact: true })).toBeVisible();
});

Then('the address result {string} is shown', async ({ page }, label: string) => {
  await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
});
