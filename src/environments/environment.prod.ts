export const environment = {
  production: true,
  // dummyjson does not allow CORS from the hosted origin, so production reads a copy of the same responses.
  stationApi: {
    stationsUrl: 'assets/data/stations.json',
    stationDetailUrl: 'assets/data/station-detail.json',
  },
};
