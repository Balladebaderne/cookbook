import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { HttpError } from "../middleware/error.js";

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = "7d";
const DEFAULT_JWT_SECRET = "cookbook-local-auth-secret";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function tokenSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  // In production we must never sign/verify JWTs with a value committed to the
  // repo — anyone reading the source could forge a valid token. Fail loudly
  // instead of silently falling back to DEFAULT_JWT_SECRET. The fallback stays
  // for local dev/test convenience (NODE_ENV !== "production").
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET must be set in production; refusing to fall back to the committed default secret."
    );
  }
  return DEFAULT_JWT_SECRET;
}

// Surfaces a missing production JWT_SECRET at boot (see createServer) so a
// misconfigured deploy fails its health check immediately, instead of booting
// fine and then 500-ing on the first auth request.
export function assertAuthConfig() {
  tokenSecret();
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || "",
  };
}

function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "A valid email is required.");
  }
}

function validatePassword(password) {
  if (!password || String(password).length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters.");
  }
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
    },
    tokenSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, tokenSecret());
  } catch {
    throw new HttpError(401, "Missing or invalid authorization token.");
  }
}

export function tokenFromRequest(req) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throw new HttpError(401, "Missing or invalid authorization token.");
  }

  return match[1];
}

export async function createUser(data = {}) {
  const email = normalizeEmail(data.email);
  const name = String(data.name || "").trim();
  const password = String(data.password || "");

  validateEmail(email);
  validatePassword(password);

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    throw new HttpError(409, "A user with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = await db.prepare(
    "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)"
  ).run(email, name, passwordHash);

  const user = await findUserById(result.lastInsertRowid);
  return {
    user,
    token: signToken(user),
  };
}

export async function authenticateUser(data = {}) {
  const email = normalizeEmail(data.email);
  const password = String(data.password || "");

  validateEmail(email);
  if (!password) {
    throw new HttpError(400, "Password is required.");
  }

  const row = await db.prepare(
    "SELECT id, email, name, password_hash FROM users WHERE email = ?"
  ).get(email);

  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const user = publicUser(row);
  return {
    user,
    token: signToken(user),
  };
}

export async function findUserById(id) {
  const row = await db.prepare(
    "SELECT id, email, name FROM users WHERE id = ?"
  ).get(id);
  return publicUser(row);
}

export async function currentUserFromRequest(req) {
  const token = tokenFromRequest(req);
  const payload = verifyToken(token);
  const user = await findUserById(Number(payload.sub));
  if (!user) {
    throw new HttpError(401, "Missing or invalid authorization token.");
  }

  return user;
}

export async function updateCurrentUser(req, data = {}) {
  const currentUser = await currentUserFromRequest(req);
  const email = data.email === undefined ? currentUser.email : normalizeEmail(data.email);
  const name = data.name === undefined ? currentUser.name : String(data.name || "").trim();

  validateEmail(email);

  const existing = await db.prepare(
    "SELECT id FROM users WHERE email = ? AND id <> ?"
  ).get(email, currentUser.id);
  if (existing) {
    throw new HttpError(409, "A user with that email already exists.");
  }

  await db.prepare(
    "UPDATE users SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(email, name, currentUser.id);

  return findUserById(currentUser.id);
}
