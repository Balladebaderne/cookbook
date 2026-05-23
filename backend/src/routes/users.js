import * as users from "../services/users.js";
import { sendJson } from "../http/responses.js";
import { defineRoute } from "../http/router.js";

export default [
  defineRoute("POST", "/api/user/create", async ({ res, body }) => {
    const result = await users.createUser(body || {});
    sendJson(res, 201, result);
  }),

  defineRoute("POST", "/api/user/token", async ({ res, body }) => {
    const result = await users.authenticateUser(body || {});
    sendJson(res, 200, result);
  }),

  defineRoute("GET", "/api/user/me", async ({ req, res }) => {
    const user = await users.currentUserFromRequest(req);
    sendJson(res, 200, user);
  }),

  defineRoute("PUT", "/api/user/me", async ({ req, res, body }) => {
    const user = await users.updateCurrentUser(req, body || {});
    sendJson(res, 200, user);
  }),
];
