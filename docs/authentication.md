# Authentication and JWT Authorization

This document explains how the Cookbook login implementation works across the
backend, frontend, database, and protected recipe endpoints.

## Overview

The authentication flow is split into two parts:

1. **User authentication**: create a user, hash the password, verify login
   credentials, and issue a JWT.
2. **JWT authorization**: require a valid bearer token before allowing recipe
   changes.

Public users can still browse recipes. Authenticated users can create, edit,
and delete recipes.

```text
Browser
  -> POST /api/user/create/ or /api/user/token/
  <- { user, token }

Browser stores token in localStorage
  -> Authorization: Bearer <token>
  -> protected recipe write endpoint
  <- create/update/delete response
```

## Backend Files

The backend implementation lives in these files:

- `backend/src/db/schema.js`
  Creates the `users` table during startup.
- `backend/src/services/users.js`
  Handles password hashing, login verification, JWT signing, JWT verification,
  current-user lookup, and profile updates.
- `backend/src/routes/users.js`
  Exposes the user endpoints under `/api/user/...`.
- `backend/src/middleware/auth.js`
  Provides `requireAuth(handler)` for protected routes.
- `backend/src/routes/recipes.js`
  Uses `requireAuth` on recipe write routes.
- `openapi.yaml`
  Documents the auth endpoints and bearer-token security requirements.

## Database Model

The `users` table is created automatically by `initDb()`:

```text
users
- id
- email
- name
- password_hash
- created_at
- updated_at
```

Passwords are never stored in plain text. `POST /api/user/create/` hashes the
password with bcrypt before inserting the user.

The schema runs on PostgreSQL through the database abstraction in `backend/src/db/`.

## User Endpoints

### Create User

```http
POST /api/user/create/
Content-Type: application/json
```

```json
{
  "email": "anna@example.com",
  "password": "correct-password",
  "name": "Anna Jensen"
}
```

Returns:

```json
{
  "user": {
    "id": 1,
    "email": "anna@example.com",
    "name": "Anna Jensen"
  },
  "token": "<jwt>"
}
```

Important behavior:

- email is normalized to lowercase
- password must be at least 8 characters
- duplicate email returns `409`
- response never includes `password` or `password_hash`

### Login

```http
POST /api/user/token/
Content-Type: application/json
```

```json
{
  "email": "anna@example.com",
  "password": "correct-password"
}
```

The backend finds the user by email and verifies the password with bcrypt.
Invalid credentials return `401`.

Successful login returns the same `{ user, token }` shape as account creation.

### Get Current User

```http
GET /api/user/me/
Authorization: Bearer <jwt>
```

The backend verifies the JWT, reads the user id from the token subject (`sub`),
loads that user from the database, and returns the public user object.

Missing, invalid, expired, or stale tokens return `401`.

### Update Current User

```http
PUT /api/user/me/
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "email": "anna.updated@example.com",
  "name": "Anna Updated"
}
```

The authenticated user can update their email and name. Duplicate email returns
`409`.

## JWT Details

JWTs are signed in `backend/src/services/users.js`.

The token payload includes:

```json
{
  "sub": "1",
  "email": "anna@example.com"
}
```

The token expires after 7 days.

JWT signing uses `JWT_SECRET` when set. If `JWT_SECRET` is missing, the backend
falls back to a local development secret. Production deployments should set a
real `JWT_SECRET` so tokens cannot be forged from a known fallback value.

## Protected Recipe Routes

These routes require:

```http
Authorization: Bearer <jwt>
```

Protected endpoints:

- `POST /api/recipes/`
- `PUT /api/recipes/{id}/`
- `DELETE /api/recipes/{id}/`

Public endpoints:

- `GET /api/recipes/`
- `GET /api/recipes/{id}/`
- `GET /api/recipes/country/{country}/`
- `GET /api/ingredients/`
- `GET /api/tags/`

This means users can browse recipes without logging in, but cannot mutate data
without a valid JWT.

## Middleware Flow

`backend/src/middleware/auth.js` exports:

```js
requireAuth(handler)
```

Protected route handlers are wrapped with it:

```js
defineRoute("POST", "/api/recipes", requireAuth(async ({ res, body }) => {
  // authenticated handler
}));
```

At request time:

1. `requireAuth` reads the `Authorization` header.
2. `currentUserFromRequest` extracts the bearer token.
3. `verifyToken` validates the JWT signature and expiry.
4. The user is loaded from the database.
5. The original route handler runs with `user` added to the route context.

If any step fails, the middleware throws `HttpError(401, ...)`, and the normal
error handler returns JSON:

```json
{
  "error": "Missing or invalid authorization token."
}
```

## Frontend Files

The frontend implementation lives in these files:

- `frontend/src/api/auth.js`
  Calls user auth endpoints and stores/removes the token in `localStorage`.
- `frontend/src/auth/AuthContext.jsx`
  Provides `user`, `token`, `loading`, `login`, `register`, and `logout`.
- `frontend/src/pages/LoginPage.jsx`
  Provides the login/register UI.
- `frontend/src/api/recipes.js`
  Adds `Authorization: Bearer <token>` to recipe API requests when a token is
  stored.
- `frontend/src/App.jsx`
  Wraps the app in `AuthProvider`, adds `/login`, and guards create/edit pages.
- `frontend/src/pages/RecipeDetail.jsx`
  Shows edit/delete controls only when a user is logged in.
- `frontend/src/pages/LandingPage.jsx`
  Shows login/logout in the landing navigation.

## Frontend Flow

On login or registration:

1. `LoginPage` calls `login()` or `register()` from `AuthContext`.
2. `AuthContext` calls `frontend/src/api/auth.js`.
3. The backend returns `{ user, token }`.
4. The token is stored in `localStorage` under `cookbook.auth.token`.
5. The current user is stored in React state.
6. The UI redirects back to the requested route or `/recipes`.

On page refresh:

1. `AuthProvider` reads `cookbook.auth.token` from `localStorage`.
2. It calls `GET /api/user/me/`.
3. If the token is valid, the user stays logged in.
4. If the token is invalid, the token is removed and the user is logged out.

On logout:

1. `logout()` removes the token from `localStorage`.
2. React auth state is cleared.
3. The UI hides authenticated actions.

## Manual Local Testing

Start the app:

```bash
docker compose --profile dev up -d --build
```

Create a user:

```bash
curl -s http://127.0.0.1/api/user/create/ \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"correct-password","name":"Demo User"}'
```

Log in:

```bash
curl -s http://127.0.0.1/api/user/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"correct-password"}'
```

Use the returned token:

```bash
TOKEN="<paste-token-here>"

curl -s http://127.0.0.1/api/user/me/ \
  -H "Authorization: Bearer $TOKEN"
```

Protected recipe create:

```bash
curl -s -i http://127.0.0.1/api/recipes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Demo Recipe","time_minutes":10,"price":"20"}'
```

Without the `Authorization` header, recipe writes should return `401`.

## Automated Tests

Backend integration tests cover:

- creating a user
- duplicate-user rejection
- invalid login rejection
- login token creation
- `/api/user/me/`
- user profile update
- protected recipe mutations returning `401` without a token
- protected recipe mutations succeeding with a valid token

Run:

```bash
cd backend
npm test
```

## Security Notes

- Never commit `.env` files or secrets.
- Do not log JWTs or password values.
- Set a real `JWT_SECRET` in production.
- The frontend hides recipe mutation UI when logged out, but backend middleware
  is the security boundary.
- `localStorage` is convenient for this project, but it means any injected
  frontend script could read the token. Keep dependencies and user-rendered
  HTML paths tight.
