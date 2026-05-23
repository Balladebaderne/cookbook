export function setCorsHeaders(res, req) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "Content-Type"
  );
  res.setHeader("Vary", "Origin, Access-Control-Request-Headers");
}

export function send(res, status, body = "", headers = {}) {
  if (!res.headersSent) {
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    res.statusCode = status;
  }

  if (body === undefined || body === null) {
    res.end();
    return;
  }

  res.end(body);
}

export function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
  });
}

export function sendHtml(res, status, html) {
  send(res, status, html, {
    "Content-Type": "text/html; charset=utf-8",
  });
}

export function sendBuffer(res, status, contentType, buffer) {
  send(res, status, buffer, {
    "Content-Type": contentType,
  });
}

export function sendNoContent(res, status = 204) {
  send(res, status);
}
