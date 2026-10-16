export type ApiFailureType = 'timeout' | 'network' | 'http' | 'unknown';

// Every failed HTTP request leaves httpInterceptor as this error, so services never see raw HttpErrorResponse.
export class ApiRequestError extends Error {
  constructor(
    readonly type: ApiFailureType,
    readonly status: number | null = null,
  ) {
    super(messageFor(type, status));
    this.name = 'ApiRequestError';
  }
}

function messageFor(type: ApiFailureType, status: number | null): string {
  switch (type) {
    case 'timeout':
      return 'The server took too long to respond. Try again.';
    case 'network':
      return 'Could not reach the server. Check your connection.';
    case 'http':
      return `The server responded with status ${status}.`;
    case 'unknown':
      return 'Unexpected error while contacting the server.';
  }
}
