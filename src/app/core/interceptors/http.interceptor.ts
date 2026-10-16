import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';

import { ApiRequestError } from '../api/api-request.error';
import { HTTP } from '../config/http.config';

// Every HttpClient call goes through here (see main.ts), so transport failures are translated in one place.
export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const apiReq = req.clone({
    setHeaders: { Accept: HTTP.acceptHeader },
  });

  return next(apiReq).pipe(
    timeout(HTTP.timeoutMs),
    catchError((error: unknown) => throwError(() => toApiRequestError(error))),
  );
};

function toApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof TimeoutError) {
    return new ApiRequestError('timeout');
  }
  if (error instanceof HttpErrorResponse) {
    return error.status === 0 ? new ApiRequestError('network') : new ApiRequestError('http', error.status);
  }
  return new ApiRequestError('unknown');
}
