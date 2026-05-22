const BASE = "/api/user";
const TOKEN_KEY = "cookbook.auth.token";

export function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function storeAuthToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

export function createUser(payload) {
  return request("/create/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload) {
  return request("/token/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(token) {
  return request("/me/", {
    method: "GET",
    token,
  });
}

export function updateMe(token, payload) {
  return request("/me/", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}
