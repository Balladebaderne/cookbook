export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound() {
  return new HttpError(404, "Ikke fundet.");
}

export function errorHandler(err, req, res) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(`${req.method} ${req.url} →`, err);
  }

  const message = status >= 500 ? "Der opstod en serverfejl." : err.message;

  if (res.headersSent) {
    res.end();
    return;
  }

  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: message }));
}
