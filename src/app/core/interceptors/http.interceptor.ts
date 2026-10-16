import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';

import { HTTP } from '../config/http.config';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const apiReq = req.clone({
    setHeaders: { Accept: HTTP.acceptHeader },
  });

  return next(apiReq).pipe(
    timeout(HTTP.timeoutMs),
    catchError((error: unknown) => {
      return throwError(() => error);
    }),
  );
};
