export class StationApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StationApiError';
  }
}
