export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, "Ikke fundet."));
}

// Express requires the 4-arg signature to identify this as an error handler.
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(`${req.method} ${req.path} →`, err);
  }
  const message = status >= 500 ? "Der opstod en serverfejl." : err.message;
  res.status(status).json({ error: message });
}
