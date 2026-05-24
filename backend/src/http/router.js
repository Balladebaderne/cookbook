import { HttpError } from "../middleware/error.js";
import { sendNoContent, setCorsHeaders } from "./responses.js";

const JSON_BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);
const JSON_CONTENT_TYPE = /^application\/(?:[\w.+-]*\+)?json\b/i;
const ONE_MEBIBYTE = 1024 * 1024;

export function defineRoute(method, path, handler) {
  return {
    method: method.toUpperCase(),
    path,
    handler,
  };
}

export function normalizePathname(pathname) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileRoutePath(path) {
  const normalizedPath = normalizePathname(path);
  if (normalizedPath === "/") {
    return { regex: /^\/$/, paramNames: [] };
  }

  const paramNames = [];
  const segments = normalizedPath.slice(1).split("/");
  const pattern = segments.map((segment) => {
    if (segment === "*") {
      paramNames.push("wildcard");
      return "(.*)";
    }

    if (segment.startsWith(":")) {
      paramNames.push(segment.slice(1));
      return "([^/]+)";
    }

    return escapeRegex(segment);
  }).join("/");

  return {
    regex: new RegExp(`^/${pattern}$`),
    paramNames,
  };
}

function matchRoute(route, pathname) {
  const match = route.regex.exec(pathname);
  if (!match) return null;

  return route.paramNames.reduce((params, name, index) => {
    params[name] = decodeURIComponent(match[index + 1] || "");
    return params;
  }, {});
}

function requestHasBody(req) {
  const contentLength = Number(req.headers["content-length"] || 0);
  return contentLength > 0 || req.headers["transfer-encoding"] !== undefined;
}

function shouldParseJsonBody(req) {
  if (!JSON_BODY_METHODS.has((req.method || "GET").toUpperCase())) {
    return false;
  }

  if (!requestHasBody(req)) {
    return false;
  }

  return JSON_CONTENT_TYPE.test(req.headers["content-type"] || "");
}

export async function readJsonBody(req, limitBytes = ONE_MEBIBYTE) {
  if (!shouldParseJsonBody(req)) {
    return undefined;
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > limitBytes) {
      throw new HttpError(413, "Request body too large.");
    }

    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

export function createRouter(routes, { onError, onNotFound }) {
  const compiledRoutes = routes.map((route) => {
    const { regex, paramNames } = compileRoutePath(route.path);
    return {
      ...route,
      regex,
      paramNames,
    };
  });

  return async function requestHandler(req, res) {
    setCorsHeaders(res, req);

    if ((req.method || "GET").toUpperCase() === "OPTIONS") {
      sendNoContent(res);
      return;
    }

    try {
      const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = normalizePathname(requestUrl.pathname);
      const method = (req.method || "GET").toUpperCase();

      let matchedRoute = null;
      let params = null;

      for (const route of compiledRoutes) {
        if (route.method !== method) continue;

        params = matchRoute(route, pathname);
        if (params) {
          matchedRoute = route;
          break;
        }
      }

      if (!matchedRoute) {
        throw onNotFound();
      }

      const body = await readJsonBody(req);
      await matchedRoute.handler({
        req,
        res,
        body,
        params,
        pathname,
        query: requestUrl.searchParams,
        url: requestUrl,
      });
    } catch (error) {
      onError(error, req, res);
    }
  };
}
