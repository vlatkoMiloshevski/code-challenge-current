export type StationApiErrorKind = 'network' | 'server' | 'invalid' | 'unknown';

export class StationApiError extends Error {
  constructor(
    readonly kind: StationApiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'StationApiError';
  }
}
